import alere
import datetime
from .json import JSONView
from typing import List, Union


class NetworthLine:
    def __init__(
            self,
            accountId: Union[str,int],
            shares: List[float],
            price: List[Union[float, None]],
        ):
        self.accountId = accountId
        self.shares = shares
        self.price = price

    def to_json(self):
        return {
            "accountId": self.accountId,
            "shares": self.shares,
            "price": self.price,
        }


class NetworthView(JSONView):

    def get_json(self, params):
        dates = params.get('dates', '').split(',')
        currency = params['currency']

        shares = {}
        prices = {}
        for d_idx, d in enumerate(dates):
            dt = datetime.datetime.fromisoformat(d).astimezone(
                    datetime.timezone.utc)

            for acc in alere.models.Balances_Currency.objects \
                   .filter(commodity__iso_code=currency,
                           mindate__lte=dt,
                           maxdate__gt=dt
                   ).exclude(account__kind__name__in=(
                       # ??? Should let users select accounts
                           'Income', 'Expense', 'Equity')):

                s = shares.setdefault(acc.account_id, [0] * len(dates))
                s[d_idx] = acc.shares

                p = prices.setdefault(acc.account_id, [0] * len(dates))
                p[d_idx] = acc.computed_price

        # ??? Perhaps let front-end reorganize things, and just send a list
        result = []
        for a in shares.keys():
            result.append(
                NetworthLine(
                    accountId=a,
                    shares=shares[a],
                    price=prices[a],
                )
            )

        return result
