import alere
import datetime
from .json import JSONView


class NetworthView(JSONView):

    def get_json(self, params):
        dates = params.get('dates', '').split(',')
        currency = self.as_commodity_id(params, 'currency')

        shares = {}
        prices = {}

        for d_idx, d in enumerate(dates):
            dt = datetime.datetime.fromisoformat(d).astimezone(
                    datetime.timezone.utc)

            for acc in alere.models.Balances_Currency.objects \
                   .filter(commodity_id=currency,
                           mindate__lte=dt,
                           maxdate__gt=dt,
                           account__kind__in=
                           alere.models.AccountFlags.networth()):

                s = shares.setdefault(acc.account_id, [0] * len(dates))
                s[d_idx] = acc.shares

                p = prices.setdefault(acc.account_id, [0] * len(dates))
                p[d_idx] = acc.computed_price

        return [
            {
                "accountId": acc,
                "shares": s,
                "price": prices[acc],
            }
            for acc, s in shares.items()
        ]
