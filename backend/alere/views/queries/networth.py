"""
Some queries that cannot be created as SQL views
"""

import alere.models
import alere.views.queries as queries
from alere.views.queries.dates import DateSet
import datetime
import django.db    # type: ignore
from typing import Union, Optional, List, Tuple, Sequence, TypedDict, Dict


class NW_Per_Account:
    def __init__(self, account_id: int):
        self.account_id = account_id
        self.shares: Dict[int, float] = {}    # one entry per date index
        self.prices: Dict[int, float] = {}    # one entry per date index


class Per_Account(TypedDict):
    accountId: int
    shares: List[Optional[float]]    # one entry per date index
    price: List[Optional[float]]     # one entry per date index


def networth(
        dates: Optional[DateSet],
        currency: Union[int, alere.models.Commodities],
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        ) -> List[Per_Account]:
    """
    Compute the networth as of certain dates.
    :returntype:
       The number of "shares" might actually be monetary value, when the
       account's commodity is a currency (in which case, the price will
       be the exchange rate between that currency and currency_id).
    """

    if not dates:
        return []

    currency_id = queries.get_currency_id(currency)
    list_splits = queries.cte_list_splits(
        dates=DateSet.from_range(
            # ??? Wrong, this executes a query on all splits to find the
            # range, though we do not need it here
            start=None,   # from beginning to get balances right
            end=None,
            granularity='years',   # irrelevant
            scenario=scenario,
            max_scheduled_occurrences=max_scheduled_occurrences,
        ),
        scenario=scenario,
        max_scheduled_occurrences=max_scheduled_occurrences,
    )

    query = f"""
       WITH RECURSIVE
          {list_splits},
          {queries.cte_balances()},
          {queries.cte_balances_currency()},
          {dates.cte}
       SELECT
          {DateSet.CTE}.idx,
          b.account_id,
          b.shares,
          b.computed_price
       FROM {queries.CTE_BALANCES_CURRENCY} b
          JOIN alr_accounts a ON (b.account_id = a.id)
          JOIN alr_account_kinds k ON (a.kind_id = k.id),
          {DateSet.CTE}
       WHERE
          b.currency_id = {currency_id}
          AND b.mindate <= {DateSet.CTE}.date
          AND {DateSet.CTE}.date < b.maxdate
          AND k.is_networth
    """

    with django.db.connection.cursor() as cur:
        cur.execute(query)

        per_account: Dict[int, NW_Per_Account] = {}
        max_idx: int = 0

        for (idx, account_id, shares, price) in cur:
            max_idx = max(max_idx, idx)
            acc = per_account.get(account_id)
            if acc is None:
                acc = per_account[account_id] = NW_Per_Account(account_id)
            acc.shares[idx] = shares
            acc.prices[idx] = price

        return [
            {
                'accountId': a.account_id,
                'shares': [a.shares.get(idx) for idx in range(0, max_idx + 1)],
                'price': [a.prices.get(idx) for idx in range(0, max_idx + 1)],
            }
            for a in per_account.values()
        ]
