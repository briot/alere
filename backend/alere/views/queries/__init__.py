"""
Some queries that cannot be created as SQL views
"""

import alere.models
import datetime
import django.db    # type: ignore
import logging
from typing import (
    List, Union, Literal, Optional, Generator, Tuple, Iterable
)
from ..json import JSON
from .dates import Dates, DateRange, CTE_DATES


me = logging.getLogger(__name__)

MAX_OCCURRENCES = 2000
# Maximum number of occurrences we compute for each recurring transactions

CTE_SPLITS = "cte_splits"
CTE_SPLITS_WITH_VALUE = "cte_splits_value"
CTE_TRANSACTIONS_FOR_ACCOUNTS = "cte_tr_account"
CTE_BALANCES = "cte_bl"
CTE_BALANCES_CURRENCY = "cte_bl_cur"
CTE_QUERY_NETWORTH = "cte_qn"
# Names of the common-table-expressions created in this package

sql_armageddon = "'2999-12-31 00:00:00'"

GroupBy = Literal['months', 'days', 'years']


def get_currency_id(currency: Union[int, alere.models.Commodities]) -> int:
    return currency if isinstance(currency, int) else currency.id


def get_scenario_id(
        scenario: Union[alere.models.Scenarios, int] =
            alere.models.Scenarios.NO_SCENARIO,
        ) -> int:
    return scenario if isinstance(scenario, int) else scenario.id


def get_max_occurrences(
        max_scheduled_occurrences: Optional[int] = None,
        ) -> int:
    return (
        MAX_OCCURRENCES if max_scheduled_occurrences is None
        else min(max_scheduled_occurrences, MAX_OCCURRENCES)
    )


def cte_list_splits(
        dates: DateRange,
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        ) -> str:
    """
    A common table expression that returns all splits to consider in the
    given time range, including the recurrences of scheduled transactions.
    """
    scenario_id = get_scenario_id(scenario)
    max_occurrences = get_max_occurrences(max_scheduled_occurrences)
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
                 OR t.scenario_id = {scenario_id})
            AND post_date >= '{dates.start_str}'
            AND post_date <= '{dates.end_str}'
    """

    if max_occurrences > 0:
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
                OR t.scenario_id = {scenario_id})

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
        WHERE s.post_date IS NOT NULL AND s.post_date < '{dates.end_str}'
          AND s.occurrence < {max_occurrences}
    ), {CTE_SPLITS} AS (
       SELECT * FROM recurring_splits_and_transaction
          WHERE post_date IS NOT NULL

            --  The last computed occurrence might be later than expected
            --  date
            AND post_date <= '{dates.end_str}'
            AND post_date >= '{dates.start_str}'
       UNION {non_recurring_splits}
    )
        """

    else:
        return f"{CTE_SPLITS} AS ({non_recurring_splits})"


def cte_splits_with_values() -> str:
    """
    Returns all splits and their associated value, scaled as needed.
    Requires cte_list_splits
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


def cte_query_networth(
        currency: Union[int, alere.models.Commodities],
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        ) -> str:
    """
    Create a query that returns the networth as computed for a set of
    dates. These dates must be found in the "dates(date)" table, which
    typically will be provided as a common table expression.

    This query also accepts one parameter, the currency_id for the result.

    requires cte_balances_currency() and dates

    :param max_scheduled_occurrences:
        if 0, ignore all scheduled transactions.
        if 1, only look at the next occurrence of them.
    """
    currency_id = get_currency_id(currency)
    scenario_id = get_scenario_id(scenario)
    max_occurrences = get_max_occurrences(max_scheduled_occurrences)

    return f"""
       {CTE_QUERY_NETWORTH} AS (
       SELECT
          {CTE_DATES}.date,
          SUM({CTE_BALANCES_CURRENCY}.balance) AS value
       FROM {CTE_DATES},
          {CTE_BALANCES_CURRENCY},
          alr_accounts
          JOIN alr_account_kinds k ON (alr_accounts.kind_id=k.id)
       WHERE
          --  sqlite compares date as strings, so we need to add
          --  the time. Otherwise, 2020-11-30 is less than
          --  2020-11-30 00:00:00 and we do not get transactions
          --  on the last day of the month
          strftime("%Y-%m-%d", {CTE_BALANCES_CURRENCY}.mindate)
             <= strftime("%Y-%m-%d", {CTE_DATES}.date)
          AND strftime("%Y-%m-%d", {CTE_DATES}.date)
             < strftime("%Y-%m-%d", {CTE_BALANCES_CURRENCY}.maxdate)
          AND {CTE_BALANCES_CURRENCY}.currency_id = {currency_id}
          AND {CTE_BALANCES_CURRENCY}.account_id = alr_accounts.id
          AND k.is_networth
       GROUP BY {CTE_DATES}.date
       )
    """


def networth_history(
        dates: Dates,
        currency: Union[int, alere.models.Commodities],
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        prior: int = 0,
        after: int = 0,
        ):
    """
    Computes the networth at the end of each month.
    The result also includes the mean of the networth computed on each
    date, with a rolling window of `prior` months before and `after` months
    after. It also includes the diff between the current row and the
    previous one, and the mean of those diffs.
    """
    adjusted = dates.extend_range(
        prior=prior,
        after=after,
    )
    q_networth = cte_query_networth(
        scenario=scenario,
        currency=currency,
        max_scheduled_occurrences=max_scheduled_occurrences,
    )
    list_splits = cte_list_splits(
        dates=adjusted,
        max_scheduled_occurrences=max_scheduled_occurrences,
        scenario=scenario,
    )
    query = f"""
        WITH RECURSIVE {adjusted.cte()},
           {list_splits},
           {cte_balances()},
           {cte_balances_currency()},
           {q_networth}
        SELECT
           tmp2.date,
           tmp2.diff,
           AVG(tmp2.diff) OVER
               (ORDER BY tmp2.date
                ROWS BETWEEN {prior:d} PRECEDING
                AND {after:d} FOLLOWING) AS average,
           tmp2.value
        FROM
           (SELECT
              tmp.date,
              tmp.value - LAG(tmp.value) OVER (ORDER BY tmp.date) as diff,
              tmp.value
            FROM ({CTE_QUERY_NETWORTH}) tmp
           ) tmp2"""

    with django.db.connection.cursor() as cur:
        cur.execute(query)
        for date, diff, average, value in cur.fetchall():
            yield date, diff, average, value


def monthly_cashflow(
        dates: Dates,
        currency: Union[int, alere.models.Commodities],
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        prior: int = 0,
        after: int = 0,
        ):
    """
    Computes the total realized income and expenses for all months.
    The result includes the rolling mean.
    This ignores scheduled transactions.

    :param max_scheduled_occurrences:
        if 0, ignore all scheduled transactions.
        if 1, only look at the next occurrence of them.
    """
    adjusted = dates.extend_range(
        prior=prior,
        after=after,
    )
    currency_id = get_currency_id(currency)
    scenario_id = get_scenario_id(scenario)
    max_occurrences = get_max_occurrences(max_scheduled_occurrences)

    query = f"""
        WITH RECURSIVE {adjusted.cte()}
        SELECT
           tmp.month,
           inc_total,
           AVG(inc_total) OVER
               (ORDER BY tmp.month
                ROWS BETWEEN {prior:d} PRECEDING
                AND {after:d} FOLLOWING) AS inc_average,
           exp_total,
           AVG(exp_total) OVER
               (ORDER BY tmp.month
                ROWS BETWEEN {prior:d} PRECEDING
                AND {after:d} FOLLOWING) AS exp_average
        FROM
           (
              --  Sum of splits for a given months, organized per
              --  category
              SELECT
                 strftime("%Y-%m", {CTE_DATES}.date) as month,
                 SUM(value) FILTER (WHERE
                    k.category = {alere.models.AccountKindCategory.INCOME}
                 ) as inc_total,
                 SUM(value) FILTER (WHERE
                    k.category = {alere.models.AccountKindCategory.EXPENSE}
                 ) as exp_total
              FROM {CTE_DATES}
                 JOIN alr_splits_with_value
                    ON (strftime("%Y-%m", post_date) =
                        strftime("%Y-%m", {CTE_DATES}.date))

                 --  ignore scheduled transactions, which did not actually
                 --  occur.
                 JOIN alr_transactions
                    ON (alr_splits_with_value.transaction_id =
                        alr_transactions.id
                        AND (alr_transactions.scheduled IS NULL
                             OR {max_occurrences > 0})
                        AND (alr_transactions.scenario_id =
                               {alere.models.Scenarios.NO_SCENARIO}
                             OR alr_transactions.scenario_id =
                               {scenario_id}))

                 JOIN alr_accounts
                    ON (alr_splits_with_value.account_id=alr_accounts.id)
                 JOIN alr_account_kinds k
                    ON (alr_accounts.kind_id=k.id)
              WHERE alr_splits_with_value.value_commodity_id={currency_id}
              GROUP BY {CTE_DATES}.date
           ) tmp
    """
    with django.db.connection.cursor() as cur:
        cur.execute(query)
        for month, inc, inc_avg, expenses, expenses_avg in cur.fetchall():
            yield month, inc, inc_avg, expenses, expenses_avg


def cte_transactions_for_accounts(
        account_ids: List[int],
        ) -> str:
    """
    The list of transactions for which one of the splits is about one of
    the accounts.
    Requires cte_list_splits
    """
    ids = ",".join("%d" % d for d in account_ids)
    return f"""{CTE_TRANSACTIONS_FOR_ACCOUNTS} AS (
        SELECT DISTINCT transaction_id
        FROM {CTE_SPLITS} s
        WHERE s.account_id IN ({ids})
    )
    """


def cte_balances() -> str:
    """
    Compute the balance of accounts for all time ranges.
    The result is a set of tuple
       (account_id, shares, [min_date, max_date))
    that covers all time and all accounts.

    Requires cte_list_splits
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


def cte_balances_currency() -> str:
    """
    Similar to cte_balances, but also combines with the prices history to
    compute the money value of those shares. This might result in more
    time intervals.
    Requires cte_balances
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
