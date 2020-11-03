from django.db.models import F, Window, Avg, RowRange, Sum, Subquery, OuterRef
from .json import JSONView
import alere
import django.db


class MeanView(JSONView):

    def get_json(self, params):
        expenses = self.as_bool(params, 'expenses')
        income = self.as_bool(params, 'income')
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')
        prior = int(params.get('prior', 6))
        after = int(params.get('after', 6))
        currency = self.as_commodity_id(params, 'currency')

        queries = []
        if expenses:
            queries.append(("expenses", alere.models.AccountFlags.expenses()))
        if income:
            queries.append(
                ("realized", alere.models.AccountFlags.realized_income()))
            queries.append(
                ("unrealized", alere.models.AccountFlags.unrealized_income()))

        with django.db.connection.cursor() as cur:
            result = {}
            for key, flags in queries:
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
                cur.execute(query, [mindate, maxdate, currency])

                for r in cur.fetchall():
                    a = result.get(r[0], None)
                    if a is None:
                        a = result[r[0]] = {
                            "date": r[0],
                        }

                    a["value_%s" % key] = -r[1]
                    a["average_%s" % key] = -r[2]

            return list(result.values())
