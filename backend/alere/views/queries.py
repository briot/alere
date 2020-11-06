"""
Some queries that cannot be created as SQL views
"""

import alere
import datetime
import django.db
from typing import List, Union


class Mean:
    def __init__(
            self,
            start: Union[datetime.date, datetime.datetime],
            end: Union[datetime.date, datetime.datetime],
            currency_id: int,
            prior=0,
            after=0):

        self.start = start.strftime("%Y-%m-%d")
        self.end = end.strftime("%Y-%m-%d")
        self.currency_id = int(currency_id)
        self.prior = int(prior)
        self.after = int(after)

    def _cte_list_of_dates(self):
        """
        A common table expression that returns the end of all months between
        the (start - prio months) to (after + prio months).
        """
        return f"""months (date) AS (
            SELECT
               --  end of first month
               date('{self.start}', '-{self.prior:d} MONTHS', 'start of month',
                    '+1 month', '-1 day')
            UNION
               --  end of next month
               SELECT date(m.date, "start of month", "+2 months", "-1 day")
               FROM months m
               WHERE m.date < DATE('{self.end}', "+{self.after:d} MONTHS")
         )"""

    def networth_history(self):
        """
        Computes the networth at the end of each month.
        The result also includes the mean of the networth computed on each date,
        with a rolling window of `prior` months before and `after` months after.
        It also includes the diff between the current row and the previous one,
        and the mean of those diffs.
        """
        nw_kinds = ",".join(
            "'%s'" % f for f in alere.models.AccountFlags.networth())
        query = f"""WITH RECURSIVE {self._cte_list_of_dates()}
            SELECT
               tmp2.date,
               tmp2.diff,
               AVG(tmp2.diff) OVER
                   (ORDER BY tmp2.date
                    ROWS BETWEEN {self.prior:d} PRECEDING
                    AND {self.after:d} FOLLOWING) AS average
            FROM
               (
               SELECT
                  tmp.date,
                  tmp.value - LAG(tmp.value) OVER (ORDER BY tmp.date) as diff
               FROM
                  (
                     SELECT
                        months.date,
                        SUM(alr_balances_currency.balance) AS value
                     FROM months,
                        alr_balances_currency,
                        alr_accounts
                     WHERE
                        alr_balances_currency.mindate <= months.date
                        AND months.date < alr_balances_currency.maxdate
                        AND alr_balances_currency.commodity_id=%s
                        AND alr_balances_currency.account_id = alr_accounts.id
                        AND alr_accounts.kind_id IN ({nw_kinds})
                     GROUP BY months.date
                   ) tmp
               ) tmp2"""

        with django.db.connection.cursor() as cur:
            cur.execute(query, [self.currency_id])
            for date, diff, average in cur.fetchall():
                yield date, diff, average

    def monthly_cashflow(self):
        """
        Computes the total realized income and expenses for all months.
        The result includes the rolling mean.
        """
        inc_kinds = ",".join(
            "'%s'" % f for f in alere.models.AccountFlags.realized_income())
        exp_kinds = ",".join(
            "'%s'" % f for f in alere.models.AccountFlags.expenses())
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
                     strftime("%%Y-%%m", months.date) as month,
                     SUM(value) FILTER (WHERE kind_id in ({inc_kinds}))
                         as inc_total,
                     SUM(value) FILTER (WHERE kind_id in ({exp_kinds}))
                         as exp_total
                  FROM months
                     JOIN alr_splits_with_value
                        ON (strftime("%%Y-%%m", post_date) =
                            strftime("%%Y-%%m", months.date))
                     JOIN alr_accounts
                        ON (alr_splits_with_value.account_id=alr_accounts.id)
                  WHERE alr_splits_with_value.value_currency_id=%s
                  GROUP BY months.date
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
