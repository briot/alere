import alere
import datetime
from .json import JSONView
from typing import List


def networth(
        dates: List[datetime.datetime],
        currency_id: int,
    ):
        shares = {}
        prices = {}
        for d_idx, dt in enumerate(dates):
            for acc in alere.models.Balances_Currency.objects \
                   .filter(commodity_id=currency_id,
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



class NetworthView(JSONView):

    def get_json(self, params):
        return networth(
            dates=self.as_time_list(params, 'dates', []),
            currency_id=self.as_commodity_id(params, 'currency'),
        )
