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
        def merge(date, key, value, avg):
            # The query used a larger range of dates to get the means
            # correct. But we should remove the extra dates in the
            # output
            d = datetime.date.fromisoformat(date)
            if d >= mindate.date() and d <= maxdate.date():
                a = result.get(date, None)
                if a is None:
                    a = result[date] = {
                            "date": date,
                    }

                a["value_%s" % key] = -value
                a["average_%s" % key] = -avg

        queries = []
        if expenses or unrealized:
            queries.append(("expenses", alere.models.AccountFlags.expenses()))
        if income or unrealized:
            queries.append(
                ("realized", alere.models.AccountFlags.realized_income()))

        with django.db.connection.cursor() as cur:
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
                        WHERE date >= DATE(%s, '-{prior} months')
                          AND date <= DATE(%s, '+{after} months')
                          AND kind_id in ({kinds})
                          AND value_currency_id=%s
                        GROUP BY date
                    ) tmp
                    """
                )
                cur.execute(query, [mindate, maxdate, currency])

                for r in cur.fetchall():
                    merge(date=r[0], key=key, value=r[1], avg=r[2])

        if unrealized:
            # compute the networth at the end of each month. By removing
            # all income and expenses, we get the unrealized gains
            # ??? Should be done with a single query instead

            d = maxdate.date()
            last_day = calendar.monthrange(d.year, d.month)[1]
            finish = datetime.date(d.year, d.month, last_day)

            d = mindate.date()
            d = datetime.date(d.year, d.month, 1)  # first day of the month

            # networth before the time period
            end_of_prev_month = d - datetime.timedelta(days=1)
            prev_nw = alere.models.Balances_Currency.objects \
                .filter(mindate__date__lte=end_of_prev_month,
                        maxdate__date__gt=end_of_prev_month,
                        commodity_id=currency,
                        account__kind__in=alere.models.AccountFlags.networth()) \
                .aggregate(value=Sum('balance'))['value']

            while d <= finish:
                # d is always the first day of the month
                last_day = calendar.monthrange(d.year, d.month)[1]
                end_of_month = datetime.date(d.year, d.month, last_day)

                nw = alere.models.Balances_Currency.objects \
                    .filter(mindate__date__lte=end_of_month,
                            maxdate__date__gt=end_of_month,
                            commodity_id=currency,
                            account__kind__in=alere.models.AccountFlags.networth()) \
                    .aggregate(value=Sum('balance'))['value']

                if d >= mindate.date():
                    merge(date=d.strftime("%Y-%m-%d"),
                          key="networth_delta",
                          value=prev_nw - nw,   # sign is negated in merge()
                          avg=0)

                    print('MANU d=%s  as_of=%s  nw=%s  delta=%s  flow=%s - %s' % (
                        d.strftime("%Y-%m-%d"),
                        end_of_month, nw, nw - (prev_nw or 0),
                        result[d.strftime("%Y-%m-%d")].get('value_realized'),
                        result[d.strftime("%Y-%m-%d")].get('value_expenses')
                        ))

                d = end_of_month + datetime.timedelta(days=1)
                prev_nw = nw

        return list(result.values())
