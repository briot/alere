import alere
import datetime
from .json import JSONView
from typing import List, Union


def networth(
        dates: List[datetime.datetime],
        currency_id: int,
        scenario: Union[int, alere.models.Scenarios] =
            alere.models.Scenarios.NO_SCENARIO,
        include_scheduled: bool = False,
        ):
    """
    Compute the networth as of certain dates.
    :param include_scheduled:
       if true, scheduled transactions (and all their occurrences before
       the given date) will be taken into account.
    :returntype:
       The number of "shares" might actually be monetary value, when the
       account's commodity is a currency (in which case, the price will
       be the exchange rate between that currency and currency_id).
    """

    scenario_id = (
        scenario.id if isinstance(scenario, alere.models.Scenarios)
        else scenario
    )

    shares = {}
    prices = {}
    for d_idx, dt in enumerate(dates):
        for acc in alere.models.Balances_Currency.objects \
               .filter(currency_id=currency_id,
                       mindate__lte=dt,
                       maxdate__gt=dt,
                       include_scheduled=include_scheduled,
                       scenario_id=scenario,
                       account__kind__is_networth=True):

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
