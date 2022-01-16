import alere.models
import datetime
from .json import JSONView
from .queries import Queries, MAX_OCCURRENCES
from typing import List, Union, Dict


def networth(
        dates: List[datetime.datetime],
        currency_id: Union[int, alere.models.Commodities],
        max_scheduled_occurrences: int = MAX_OCCURRENCES,
        scenario: Union[int, alere.models.Scenarios] =
            alere.models.Scenarios.NO_SCENARIO,
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

    q = Queries(
        currency_id=currency_id,
        scenario_id=(
            scenario.id if isinstance(scenario, alere.models.Scenarios)
            else scenario
        ),
        max_scheduled_occurrences=max_scheduled_occurrences,
    )

    dict_shares: Dict[int, List[float]] = {}
    dict_prices: Dict[int, List[float]] = {}
    for (date_idx, account_id, shares, price) in q.networth(dates):
        # create default entries if needed
        s = dict_shares.setdefault(account_id, [0] * len(dates))
        p = dict_prices.setdefault(account_id, [0] * len(dates))

        s[date_idx] = shares
        p[date_idx] = price

    return [
        {
            "accountId": acc,
            "shares": dict_shares[acc],
            "price": dict_prices[acc],
        }
        for acc in dict_shares
    ]


class NetworthView(JSONView):

    def get_json(self, params):
        return networth(
            dates=self.as_time_list(params, 'dates', []),
            currency_id=self.as_commodity_id(params, 'currency'),
        )
