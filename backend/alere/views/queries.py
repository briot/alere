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
               FROM months m,
                  (SELECT MAX(alr_balances_currency.mindate) as date
                   FROM alr_balances_currency) range
               WHERE m.date < DATE('{self.end}', "+{self.after:d} MONTHS")
                  and m.date <= range.date
         )"""

    @staticmethod
    def query_networth():
        """
        Create a query that returns the networth as computed for a set of
        dates. These dates must be found in the "months(date)" table, which
        typically will be provided as a common table expression.

        This query also accepts one parameter, the currency_id for the result.
        """
        return f"""
           SELECT
              months.date,
              SUM(alr_balances_currency.balance) AS value
           FROM months,
              alr_balances_currency,
              alr_accounts
              JOIN alr_account_kinds k ON (alr_accounts.kind_id=k.id)
           WHERE
              --  sqlite compares date as strings, so we need to add
              --  the time. Otherwise, 2020-11-30 is less than
              --  2020-11-30 00:00:00 and we do not get transactions
              --  on the last day of the month
              strftime("%%Y-%%m-%%d", alr_balances_currency.mindate)
                 <= strftime("%%Y-%%m-%%d", months.date)
              AND strftime("%%Y-%%m-%%d", months.date)
                 < strftime("%%Y-%%m-%%d", alr_balances_currency.maxdate)
              AND alr_balances_currency.currency_id=%s
              AND alr_balances_currency.account_id = alr_accounts.id
              AND k.is_networth
           GROUP BY months.date
        """

    def networth_history(self):
        """
        Computes the networth at the end of each month.
        The result also includes the mean of the networth computed on each date,
        with a rolling window of `prior` months before and `after` months after.
        It also includes the diff between the current row and the previous one,
        and the mean of those diffs.
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
                     strftime("%%Y-%%m", months.date) as month,
                     SUM(value) FILTER (WHERE k.is_income) as inc_total,
                     SUM(value) FILTER (WHERE k.is_expense) as exp_total
                  FROM months
                     JOIN alr_splits_with_value
                        ON (strftime("%%Y-%%m", post_date) =
                            strftime("%%Y-%%m", months.date))
                     JOIN alr_accounts
                        ON (alr_splits_with_value.account_id=alr_accounts.id)
                     JOIN alr_account_kinds k
                        ON (alr_accounts.kind_id=k.id)
                  WHERE alr_splits_with_value.value_commodity_id=%s
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
