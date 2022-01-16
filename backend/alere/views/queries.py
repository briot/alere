"""
Some queries that cannot be created as SQL views
"""

import alere.models
import datetime
import django.db    # type: ignore
import logging
from typing import List, Union, Literal, Optional, Generator, Tuple


me = logging.getLogger(__name__)

MAX_DATES = 366
# A limit that controls how many dates we return. This is used to limit the
# scope of queries.

MAX_OCCURRENCES = 2000
# Maximum number of occurrences we compute for each recurring transactions

CTE_DATES = "cte_dates"
CTE_SPLITS = "cte_splits"
CTE_SPLITS_WITH_VALUE = "cte_splits_value"
CTE_TRANSACTIONS_FOR_ACCOUNTS = "cte_tr_account"
CTE_BALANCES = "cte_bl"
CTE_BALANCES_CURRENCY = "cte_bl_cur"
# Names of the common-table-expressions created in this package

maxdate = (
    datetime.datetime.now(tz=datetime.timezone.utc)
    + datetime.timedelta(days=70 * 365)
)
# Never compute past that date

sql_armageddon = "'2999-12-31 00:00:00'"

GroupBy = Literal['months', 'days', 'years']


class Split_Descr:
    def __init__(
            self,
            account_id: int,
            post_date: datetime.datetime,
            amount: float,
            currency: int,
            reconcile: bool,
            shares: float,
            price: float,
            payee: Optional[str],
            ):
        self.account_id = account_id
        self.post_date = post_date
        self.amount = amount
        self.currency = currency
        self.reconcile = reconcile
        self.shares = shares
        self.price = price
        self.payee = payee

    def to_json(self):
        return {
            "accountId": self.account_id,
            "amount": self.amount,
            "currency": self.currency,
            "date": self.post_date.strftime("%Y-%m-%d"),
            "payee": self.payee,
            "price": self.price,
            "reconcile": self.reconcile,
            "shares": self.shares,
        }

    def __repr__(self):
        return str(self.to_json())


class Transaction_Descr:
    def __init__(
            self,
            id: int,
            occurrence: int,
            date: datetime.datetime,
            balance: int,
            balance_shares: int,
            memo: str,
            check_number: str,
            is_recurring: bool,
            ):
        self.id = id
        self.occurrence = occurrence
        self.date = date
        self.balance = 0
        self.balance_shares = 0
        self.memo = memo
        self.check_number = check_number
        self.is_recurring = is_recurring
        self.splits: List[Split_Descr] = []

    def to_json(self):
        return {
            "id": self.id,
            "occ": self.occurrence,
            "date": self.date.strftime("%Y-%m-%d"),
            "balance": self.balance,
            "balanceShares": self.balance_shares,
            "memo": self.memo,
            "checknum": self.check_number,
            "recurring": self.is_recurring,
            "splits": [s.to_json() for s in self.splits],
        }

    def __repr__(self):
        return str(self.to_json())


class Queries:
    def __init__(
            self,
            start: Union[None, datetime.date, datetime.datetime] = None,
            end: Union[None, datetime.date, datetime.datetime] = None,
            currency_id: Union[int, alere.models.Commodities] = -1,
            groupby: GroupBy = None,
            scenario_id: int = alere.models.Scenarios.NO_SCENARIO,
            max_scheduled_occurrences=MAX_OCCURRENCES,
            prior=0,
            after=0,
            ):
        """
        :param max_scheduled_occurrences:
            if 0, ignore all scheduled transactions.
            if 1, only look at the next occurrence of them.
        """

        self.start = (start or datetime.datetime.min).strftime("%Y-%m-%d")
        self.end = min(end or maxdate, maxdate).strftime("%Y-%m-%d")
        self.currency_id = (
            currency_id if isinstance(currency_id, int)
            else currency_id.id
        )
        self.prior = int(prior)
        self.after = int(after)
        self.groupby = groupby or 'months'
        self.scenario_id = scenario_id
        self.max_scheduled_occurrences = max_scheduled_occurrences

    def _cte_list_of_dates(self) -> str:
        """
        A common table expression that returns all dates between
        the (start - prio) to (after + prio), depending on self's config.
        """
        if self.groupby == 'years':
            return f"""{CTE_DATES} (date) AS (
            SELECT
                MIN(d1, d2)
                FROM (
                   SELECT
                      date('{self.end}', '+1 YEAR', 'start of year', '-1 day',
                         '+{self.after:d} YEARS') as d1,
                      MAX(alr_balances_currency.mindate) as d2
                   FROM alr_balances_currency
                )
            UNION
               SELECT date(m.date, "-1 YEAR")
               FROM {CTE_DATES} m,
                  (SELECT MIN(alr_balances_currency.mindate) as date
                   FROM alr_balances_currency) range
               WHERE m.date >= date('{self.start}', '-{self.prior:d} YEARS')
                  AND m.date >= range.date
               LIMIT {MAX_DATES}
            )"""

        elif self.groupby == 'days':
            return f"""{CTE_DATES} (date) AS (
            SELECT date('{self.end}', '+{self.after:d} DAYS')
            UNION
               SELECT date(m.date, "-1 day")
               FROM {CTE_DATES} m
               WHERE m.date >= date('{self.start}', '-{self.prior:d} DAYS')
               LIMIT {MAX_DATES}
            )"""

        else:
            return f"""{CTE_DATES} (date) AS (
            SELECT
               --  end of first month (though no need to go past the oldest
               --  known date in the data
               date(MAX(user.d1, user.d2), '+1 month', '-1 day')
               FROM
                  (SELECT
                      date('{self.start}',
                           '-{self.prior:d} MONTHS', 'start of month') as d1,
                      MIN(alr_balances_currency.mindate) as d2
                   FROM alr_balances_currency
                  ) user

            UNION
               --  end of next month, though no need to go past the last known
               --  date in the data
               SELECT date(m.date, "start of month", "+2 months", "-1 day")
               FROM {CTE_DATES} m,
                  (SELECT MAX(alr_balances_currency.mindate) as date
                   FROM alr_balances_currency) range
               WHERE m.date < DATE('{self.end}', "+{self.after:d} MONTHS")
                  and m.date <= range.date
               LIMIT {MAX_DATES}
            )"""

    def _cte_list_splits(self) -> str:
        """
        A common table expression that returns all splits to consider in the
        given time range, including the recurrences of scheduled transactions.
        Does not require _cte_list_of_dates.
        """
        non_recurring_splits = f"""
            SELECT
               t.id as transaction_id,
               1 as occurrence,
               s.id as split_id,
               t.timestamp,
               t.timestamp AS initial_timestamp,
               t.scheduled,
               t.scenario_id,
               s.account_id,
               s.scaled_qty,
               s.scaled_value,
               s.value_commodity_id,
               s.reconcile,
               s.payee_id,
               s.post_date
            FROM alr_transactions t
               JOIN alr_splits s ON (s.transaction_id = t.id)
            WHERE t.scheduled IS NULL
                AND (t.scenario_id = {alere.models.Scenarios.NO_SCENARIO}
                     OR t.scenario_id = {self.scenario_id})
        """

        if self.max_scheduled_occurrences > 0:
            # overrides the post_date for the splits associated with a
            # recurring transaction
            return f"""recurring_splits_and_transaction AS (
            SELECT
               t.id as transaction_id,
               1 as occurrence,
               s.id as split_id,
               alr_next_event(t.scheduled, t.timestamp, t.last_occurrence)
                  AS timestamp,
               t.timestamp AS initial_timestamp,
               t.scheduled,
               t.scenario_id,
               s.account_id,
               s.scaled_qty,
               s.scaled_value,
               s.value_commodity_id,
               s.reconcile,
               s.payee_id,
               alr_next_event(
                   t.scheduled, t.timestamp, t.last_occurrence) as post_date
            FROM alr_transactions t
               JOIN alr_splits s ON (s.transaction_id = t.id)
            WHERE t.scheduled IS NOT NULL
               AND (t.scenario_id = {alere.models.Scenarios.NO_SCENARIO}
                    OR t.scenario_id = {self.scenario_id})

            UNION SELECT
               s.transaction_id,
               s.occurrence + 1,
               s.split_id,
               alr_next_event(s.scheduled, s.initial_timestamp, s.post_date),
               s.initial_timestamp,
               s.scheduled,
               s.scenario_id,
               s.account_id,
               s.scaled_qty,
               s.scaled_value,
               s.value_commodity_id,
               s.reconcile,
               s.payee_id,
               alr_next_event(s.scheduled, s.initial_timestamp, s.post_date)
            FROM recurring_splits_and_transaction s
            WHERE s.post_date IS NOT NULL AND s.post_date < '{self.end}'
              AND s.occurrence < {self.max_scheduled_occurrences}
        ), {CTE_SPLITS} AS (
           SELECT * FROM recurring_splits_and_transaction
              WHERE post_date IS NOT NULL

                --  The last computed occurrence might be later than expected
                --  date
                AND post_date <= '{self.end}'
           UNION {non_recurring_splits}
        )
            """

        else:
            return f"{CTE_SPLITS} AS ({non_recurring_splits})"

    def _cte_splits_with_values(self) -> str:
        """
        Returns all splits and their associated value, scaled as needed.
        Requires _cte_list_splits
        """
        return f"""{CTE_SPLITS_WITH_VALUE} AS (
            SELECT
               s.*,
               CAST(s.scaled_value AS FLOAT) / c.price_scale AS value,
               CAST(s.scaled_value * alr_accounts.commodity_scu AS FLOAT)
                  / (s.scaled_qty * c.price_scale)
                  AS computed_price
            FROM
               {CTE_SPLITS} s
               JOIN alr_accounts ON (s.account_id = alr_accounts.id)
               JOIN alr_commodities c ON (s.value_commodity_id=c.id)
        )
        """

    def query_networth(self) -> str:
        """
        Create a query that returns the networth as computed for a set of
        dates. These dates must be found in the "dates(date)" table, which
        typically will be provided as a common table expression.

        This query also accepts one parameter, the currency_id for the result.
        """
        return f"""
           SELECT
              {CTE_DATES}.date,
              SUM(alr_balances_currency.balance) AS value
           FROM {CTE_DATES},
              alr_balances_currency,
              alr_accounts
              JOIN alr_account_kinds k ON (alr_accounts.kind_id=k.id)
           WHERE
              --  sqlite compares date as strings, so we need to add
              --  the time. Otherwise, 2020-11-30 is less than
              --  2020-11-30 00:00:00 and we do not get transactions
              --  on the last day of the month
              strftime("%%Y-%%m-%%d", alr_balances_currency.mindate)
                 <= strftime("%%Y-%%m-%%d", {CTE_DATES}.date)
              AND strftime("%%Y-%%m-%%d", {CTE_DATES}.date)
                 < strftime("%%Y-%%m-%%d", alr_balances_currency.maxdate)
              AND alr_balances_currency.currency_id=%s
              AND alr_balances_currency.account_id = alr_accounts.id
              AND k.is_networth
              AND alr_balances_currency.include_scheduled =
                 {1 if self.max_scheduled_occurrences > 0 else 0}
              AND alr_balances_currency.scenario_id = {self.scenario_id}
           GROUP BY {CTE_DATES}.date
        """

    def networth_history(self):
        """
        Computes the networth at the end of each month.
        The result also includes the mean of the networth computed on each
        date, with a rolling window of `prior` months before and `after` months
        after. It also includes the diff between the current row and the
        previous one, and the mean of those diffs.
        """
        query = f"""WITH RECURSIVE {self._cte_list_of_dates()}
            SELECT
               tmp2.date,
               tmp2.diff,
               AVG(tmp2.diff) OVER
                   (ORDER BY tmp2.date
                    ROWS BETWEEN {self.prior:d} PRECEDING
                    AND {self.after:d} FOLLOWING) AS average,
               tmp2.value
            FROM
               (SELECT
                  tmp.date,
                  tmp.value - LAG(tmp.value) OVER (ORDER BY tmp.date) as diff,
                  tmp.value
                FROM ({self.query_networth()}) tmp
               ) tmp2"""

        with django.db.connection.cursor() as cur:
            cur.execute(query, [self.currency_id])
            for date, diff, average, value in cur.fetchall():
                yield date, diff, average, value

    def monthly_cashflow(self):
        """
        Computes the total realized income and expenses for all months.
        The result includes the rolling mean.
        This ignores scheduled transactions.
        """
        query = (
            f"""
            WITH RECURSIVE {self._cte_list_of_dates()}
            SELECT
               tmp.month,
               inc_total,
               AVG(inc_total) OVER
                   (ORDER BY tmp.month
                    ROWS BETWEEN {self.prior:d} PRECEDING
                    AND {self.after:d} FOLLOWING) AS inc_average,
               exp_total,
               AVG(exp_total) OVER
                   (ORDER BY tmp.month
                    ROWS BETWEEN {self.prior:d} PRECEDING
                    AND {self.after:d} FOLLOWING) AS exp_average
            FROM
               (
                  --  Sum of splits for a given months, organized per
                  --  category
                  SELECT
                     strftime("%%Y-%%m", {CTE_DATES}.date) as month,
                     SUM(value) FILTER (WHERE
                        k.category = {alere.models.AccountKindCategory.INCOME}
                     ) as inc_total,
                     SUM(value) FILTER (WHERE
                        k.category = {alere.models.AccountKindCategory.EXPENSE}
                     ) as exp_total
                  FROM {CTE_DATES}
                     JOIN alr_splits_with_value
                        ON (strftime("%%Y-%%m", post_date) =
                            strftime("%%Y-%%m", {CTE_DATES}.date))

                     --  ignore scheduled transactions, which did not actually
                     --  occur.
                     JOIN alr_transactions
                        ON (alr_splits_with_value.transaction_id =
                            alr_transactions.id
                            AND (alr_transactions.scheduled IS NULL
                                 OR {self.max_scheduled_occurrences > 0})
                            AND (alr_transactions.scenario_id =
                                   {alere.models.Scenarios.NO_SCENARIO}
                                 OR alr_transactions.scenario_id =
                                   {self.scenario_id}))

                     JOIN alr_accounts
                        ON (alr_splits_with_value.account_id=alr_accounts.id)
                     JOIN alr_account_kinds k
                        ON (alr_accounts.kind_id=k.id)
                  WHERE alr_splits_with_value.value_commodity_id=%s
                  GROUP BY {CTE_DATES}.date
               ) tmp
              """
        )
        min_month = self.start[:7]
        max_month = self.end[:7]
        with django.db.connection.cursor() as cur:
            cur.execute(query, [self.currency_id])
            for month, inc, inc_avg, expenses, expenses_avg in cur.fetchall():
                if min_month < month and month <= max_month:
                    yield month, inc, inc_avg, expenses, expenses_avg

    def _cte_transactions_for_accounts(
            self,
            account_ids: List[int],
            ) -> str:
        """
        The list of transactions for which one of the splits is about one of
        the accounts.
        Requires _cte_list_splits
        """
        ids = ",".join("%d" % d for d in account_ids)
        return f"""{CTE_TRANSACTIONS_FOR_ACCOUNTS} AS (
            SELECT DISTINCT transaction_id
            FROM {CTE_SPLITS} s
            WHERE s.account_id IN ({ids})
        )
        """

    def ledger(
            self,
            account_ids: List[int] = None,
            ) -> Generator[Transaction_Descr, None, None]:
        """
        Return the ledger information.
        This takes into account whether the user wants to see scheduled
        transactions or not, the current scenario,...

        :param account_ids:
            Can be used to restrict the output to those transactions that
            impact those accounts (all splits of the transactions are still
            returned, even those that are not for one of the accounts.
        """

        filter_account_cte = (
            ", " + self._cte_transactions_for_accounts(account_ids)
            if account_ids
            else ""
        )
        filter_account_from = (
            f" JOIN {CTE_TRANSACTIONS_FOR_ACCOUNTS} t USING (transaction_id)"
        )

        query = f"""WITH RECURSIVE {self._cte_list_splits()}
           , {self._cte_splits_with_values()}
           {filter_account_cte}
           , all_splits_since_epoch AS (
              SELECT
                 s.transaction_id,
                 s.occurrence,
                 s.timestamp,
                 t.memo,
                 t.check_number,
                 s.scaled_qty,
                 a.commodity_scu,
                 s.computed_price,
                 s.account_id,
                 s.post_date,
                 s.value,
                 s.value_commodity_id,
                 s.reconcile,
                 s.scheduled,
                 p.name,
                 sum(s.scaled_qty)
                    OVER (PARTITION BY s.account_id
                          ORDER BY s.timestamp, s.transaction_id, s.post_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                    AS scaled_qty_balance
              FROM {CTE_SPLITS_WITH_VALUE} s
                 {filter_account_from}
                 JOIN alr_transactions t ON (s.transaction_id = t.id)
                 JOIN alr_accounts a ON (s.account_id = a.id)
                 LEFT JOIN alr_payees p ON (s.payee_id = p.id)
           )
        SELECT s.*
        FROM all_splits_since_epoch s
        WHERE s.post_date >= '{self.start}'

          --  Always include non-validated occurrences of recurring
          --  transactions.
          OR s.scheduled IS NOT NULL
        ORDER BY s.timestamp, s.transaction_id
        """

        ref_id = (
            account_ids[0]
            if account_ids and len(account_ids) == 1
            else -1
        )

        current: Optional[Transaction_Descr] = None

        with django.db.connection.cursor() as cur:
            cur.execute(query)

            for (transaction_id, occurrence,
                    timestamp, memo, check_number, scaled_qty,
                    commodity_scu, computed_price, account_id, post_date,
                    value, value_commodity_id, reconcile, scheduled,
                    payee, scaled_qty_balance) in cur:

                if (
                        current is None
                        or transaction_id != current.id
                        or occurrence != current.occurrence
                   ):
                    if current is not None:
                        yield current

                    current = Transaction_Descr(
                        id=transaction_id,
                        date=timestamp,
                        occurrence=occurrence,
                        balance=0,
                        balance_shares=0,
                        memo=memo,
                        check_number=check_number,
                        is_recurring=scheduled is not None,
                    )

                # Compute the balance when there is a single account
                # ??? Should we have one balance per account instead ?
                if account_id == ref_id:
                    current.balance_shares = scaled_qty_balance / commodity_scu
                    current.balance = (
                        current.balance_shares * computed_price
                        if computed_price is not None
                        else None
                    )

                current.splits.append(
                    Split_Descr(
                        account_id=account_id,
                        post_date=post_date,
                        amount=value,
                        currency=value_commodity_id,
                        reconcile=reconcile,
                        shares=scaled_qty / commodity_scu,
                        price=computed_price,
                        payee=payee,
                    )
                )

        if current is not None:
            yield current

    def _cte_balances(self) -> str:
        """
        Compute the balance of accounts for all time ranges.
        The result is a set of tuple
           (account_id, shares, [min_date, max_date))
        that covers all time and all accounts.

        Depending on self's config, this will include scheduled transactions
        (possibly with a limited number of occurrences), and transactions from
        specific scenarios.

        Requires _cte_list_splits
        """

        return f"""
        {CTE_BALANCES} AS (
           SELECT
              a.id AS account_id,
              a.commodity_id,
              s.post_date as mindate,
              COALESCE(
                 LEAD(s.post_date)
                    OVER (PARTITION BY s.account_id ORDER by s.post_date),
                 {sql_armageddon}
                ) AS maxdate,
              CAST( sum(s.scaled_qty)
                 OVER (PARTITION BY s.account_id
                       ORDER BY s.post_date
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 AS FLOAT
                ) / a.commodity_scu AS shares
           FROM
              {CTE_SPLITS} s
              JOIN alr_accounts a ON (s.account_id = a.id)
        )
        """

    def _cte_balances_currency(self) -> str:
        """
        Similar to _cte_balances, but also combines with the prices history to
        compute the money value of those shares. This might result in more
        time intervals.
        Requires _cte_balances
        """

        return f"""
        {CTE_BALANCES_CURRENCY} AS (
            SELECT
               b.account_id,
               alr_commodities.id as currency_id,
               max(b.mindate, p.mindate) as mindate,
               min(b.maxdate, p.maxdate) as maxdate,
               CAST(b.shares * p.scaled_price AS FLOAT)
                  / source.price_scale as balance,
               b.shares,
               CAST(p.scaled_price AS FLOAT) / source.price_scale
                  as computed_price
            FROM
               {CTE_BALANCES} b,
               alr_price_history_with_turnkey p,
               alr_commodities,
               alr_commodities source
            WHERE
               --  price from: the account's commodity
               source.id = b.commodity_id
               AND b.commodity_id=p.origin_id

               --  price target: the user's requested currency
               AND p.target_id=alr_commodities.id

               --  intervals intersect
               AND b.mindate < p.maxdate
               AND p.mindate < b.maxdate

               --  target commodities can only be currencies
               AND alr_commodities.kind = 'C'
        )
        """

    def networth(
            self,
            dates: List[datetime.datetime],
            ) -> Generator[Tuple[int, int, float, float], None, None]:

        if not dates:
            return

        all_dates = ", ".join(
            f"({idx}, '{d.strftime('%Y-%m-%d %H:%M:%s')}')"
            for idx, d in enumerate(dates)
        )

        query = f"""
           WITH RECURSIVE
              {self._cte_list_splits()},
              {self._cte_balances()},
              {self._cte_balances_currency()},
              dates(idx, day) AS (VALUES {all_dates})
           SELECT
              dates.idx,
              b.account_id,
              b.shares,
              b.computed_price
           FROM {CTE_BALANCES_CURRENCY} b
              JOIN alr_accounts a ON (b.account_id = a.id)
              JOIN alr_account_kinds k ON (a.kind_id = k.id),
              dates
           WHERE
              b.currency_id = {self.currency_id}
              AND b.mindate <= dates.day
              AND dates.day < b.maxdate
              AND k.is_networth
        """

        with django.db.connection.cursor() as cur:
            cur.execute(query)
            yield from cur
