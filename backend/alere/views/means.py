from django.db.models import F, Window, Avg, RowRange, Sum, Subquery, OuterRef
from .json import JSONView
import alere
import calendar
import datetime
import django.db


class MeanView(JSONView):

    def get_json(self, params):
        expenses = self.as_bool(params, 'expenses')
        income = self.as_bool(params, 'income')
        unrealized = self.as_bool(params, 'unrealized')
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')
        prior = int(params.get('prior', 6))
        after = int(params.get('after', 6))
        currency = self.as_commodity_id(params, 'currency')

        result = {}

        inc_kinds = ",".join(
            "'%s'" % f for f in alere.models.AccountFlags.realized_income())
        exp_kinds = ",".join(
            "'%s'" % f for f in alere.models.AccountFlags.expenses())
        nw_kinds = ",".join(
            "'%s'" % f for f in alere.models.AccountFlags.networth())

        with django.db.connection.cursor() as cur:
            # Generate an explicit list of months, to avoid possible
            # months with no value (for which we would get no mean either,
            # and which would be skipped when computing rolling means)
            query = (
                f"""
                WITH RECURSIVE months (date) AS (
                   --  we need the first of month to match balance_currency
                   SELECT strftime("%%Y-%%m-01", DATE(%s, '-{prior} MONTHS'))
                   UNION SELECT DATE(m.date, "+1 MONTHS")
                         FROM months m
                         WHERE m.date < DATE(%s, "+{after} MONTHS")
                )
                SELECT
                   months.date,
                   inc_total,
                   AVG(inc_total) OVER
                       (ORDER BY months.date
                        ROWS BETWEEN {prior} PRECEDING AND {after} FOLLOWING
                       ) AS inc_average,
                   exp_total,
                   AVG(exp_total) OVER
                       (ORDER BY months.date
                        ROWS BETWEEN {prior} PRECEDING AND {after} FOLLOWING
                       ) AS exp_average
                FROM
                   months
                   LEFT JOIN (
                      --  Sum of splits for a given months, organized per
                      --  category
                      SELECT
                         date,
                         SUM(value) FILTER (WHERE kind_id in ({inc_kinds}))
                             as inc_total,
                         SUM(value) FILTER (WHERE kind_id in ({exp_kinds}))
                             as exp_total
                      FROM alr_by_month

                      --  Start a few months before so that the means are
                      --  correctly computed
                      WHERE date >= DATE(%s, '-{prior} months')
                        AND date <= DATE(%s, '+{after} months')

                        --  Convert to the expected currency
                        AND value_currency_id=%s
                      GROUP BY date
                   ) tmp
                   ON (tmp.date=months.date)
                  """
            )
            cur.execute(query, [mindate, maxdate, mindate, maxdate, currency])
            for r in cur.fetchall():
                # The query used a larger range of dates to get the means
                # correct. But we should remove the extra dates in the
                # output
                d = datetime.date.fromisoformat(r[0])
                if d >= mindate.date() and d <= maxdate.date():
                    index = r[0][:7]  # only yyyy-mm
                    result[index] = {
                        "date": index,
                        "value_expenses": -(r[3] or 0),
                        "average_expenses": -(r[4] or 0),
                        "value_realized": -(r[1] or 0),
                        "average_realized": -(r[2] or 0),
                    }

        if unrealized:
            # compute the networth at the end of each month. By removing
            # all income and expenses, we get the unrealized gains

            query = f"""
                WITH RECURSIVE months (date) AS (
                   SELECT
                      --  end of mindate
                      date(%s, '-{prior} MONTHS', 'start of month',
                           '+1 month', '-1 day')
                   UNION
                      --  end of next month
                      SELECT
                         date(m.date, "start of month", "+2 months", "-1 day")
                      FROM months m
                      WHERE m.date < DATE(%s, "+{after} MONTHS")
                )
                SELECT
                   tmp2.date,
                   tmp2.diff,
                   AVG(tmp2.diff) OVER
                       (ORDER BY tmp2.date
                        ROWS BETWEEN {prior} PRECEDING AND {after} FOLLOWING
                       ) AS average
                FROM
                   (
                   SELECT
                      tmp.date,
                      tmp.value - LAG(tmp.value) OVER (ORDER BY tmp.date) as diff
                   FROM
                      (
                         --  Networth at the beginning of each month
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
                   ) tmp2
            """
            with django.db.connection.cursor() as cur:
                cur.execute(query, [mindate, maxdate, currency])
                for r in cur.fetchall():
                    index = r[0][:7]  # only yyyy-mm
                    if index in result:
                        result[index]["value_networth_delta"] = r[1] or 0
                        result[index]["average_networth_delta"] = r[2] or 0

        return list(result.values())
