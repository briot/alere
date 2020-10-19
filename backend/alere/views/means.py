from django.db.models import F, Window, Avg, RowRange, Sum, Subquery, OuterRef
from .json import JSONView
import alere
import django.db


class MeanView(JSONView):

    def get_json(self, params):
        expenses = self.as_bool(params, 'expenses')
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')
        prior = int(params.get('prior', 6))
        after = int(params.get('after', 6))
        currency = self.as_commodity_id(params, 'currency')

        if expenses:
            flags = alere.models.AccountFlags.expenses()
            sign = 1.0
        else:
            flags = alere.models.AccountFlags.all_income()
            sign = -1.0

        kinds = ",".join("'%s'" % f for f in flags)

        query = (
            f"""
            SELECT
               date,
               total,
               AVG(total) OVER
                   (ORDER BY date
                    ROWS BETWEEN {prior} PRECEDING AND {after} FOLLOWING
                   ) AS average
            FROM (
                SELECT date, SUM(value) as total
                FROM alr_by_month
                WHERE date >= %s
                  AND date <= %s
                  AND kind_id in ({kinds})
                  AND value_currency_id=%s
                GROUP BY date
            ) tmp
            """
        )

        with django.db.connection.cursor() as cur:
            cur.execute(query, [mindate, maxdate, currency])
            return [
                {
                    "date": r[0],
                    "value": r[1] * sign,
                    "average": r[2] * sign,
                }
                for r in cur.fetchall()
            ]
