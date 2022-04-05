import alere.models
import alere.views.queries as queries
import datetime
import decimal
import django.db    # type: ignore
from typing import Union, Optional, Dict, Iterable, List, NamedTuple
from .dates import DateRange
from . import get_currency_id


Per_Account_Splits = Dict[int, float]  # account_id => sum of splits


class Simple_Split(NamedTuple):
    # When was the split posted to the account
    post_date: datetime.datetime

    account_id: int
    value: decimal.Decimal


def sum_splits_per_account(
        dates: DateRange,
        currency: Union[int, alere.models.Commodities],
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        ) -> Per_Account_Splits:
    """
    For each account, computes the total of splits that apply to it in the
    given time range.
    """
    cte_splits = queries.cte_list_splits(
        dates=dates,
        scenario=scenario,
        max_scheduled_occurrences=max_scheduled_occurrences,
    )
    query = f"""
       WITH RECURSIVE {cte_splits},
          {queries.cte_splits_with_values()}
       SELECT s.account_id, SUM(s.value)
       FROM {queries.CTE_SPLITS_WITH_VALUE} s
       WHERE s.value_commodity_id = {get_currency_id(currency)}
       GROUP BY s.account_id
    """
    with django.db.connection.cursor() as cur:
        cur.execute(query)
        return {account_id: val for account_id, val in cur}


def splits_with_values(
        dates: DateRange,
        currency: Union[int, alere.models.Commodities],
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        accounts: Optional[Iterable[int]] = None,
        ) -> List[Simple_Split]:
    """
    List all splits in the given time range, for a subset of the accounts.

    ??? How is this different from ledger()
    """
    cte_splits = queries.cte_list_splits(
        dates=dates,
        scenario=scenario,
        max_scheduled_occurrences=max_scheduled_occurrences,
    )

    ids = None if accounts is None else ", ".join('%d' % a for a in accounts)
    account_check = "" if ids is None else f" AND s.account_id IN ({ids})"

    query = f"""
       WITH RECURSIVE {cte_splits},
          {queries.cte_splits_with_values()}
       SELECT s.post_date, s.account_id, s.value
       FROM {queries.CTE_SPLITS_WITH_VALUE} s
       WHERE s.value_commodity_id = {get_currency_id(currency)}
        {account_check}
    """
    with django.db.connection.cursor() as cur:
        cur.execute(query)
        return [
            Simple_Split(
                post_date,
                int(account_id),
                decimal.Decimal(value),
            )
            for post_date, account_id, value in cur
        ]
