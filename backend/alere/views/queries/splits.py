import alere.models
import alere.views.queries as queries
import datetime
import django.db    # type: ignore
from typing import Union, Optional, Dict
from ..json import JSON
from .dates import Dates, DateRange, CTE_DATES


Per_Account_Splits = Dict[int, float]  # account_id => sum of splits


def splits_with_values(
        dates: DateRange,
        currency: Union[int, alere.models.Commodities],
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        ) -> Per_Account_Splits:

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
       WHERE s.value_commodity_id = {currency}
       GROUP BY s.account_id
    """
    with django.db.connection.cursor() as cur:
        cur.execute(query)
        return {account_id: val for account_id, val in cur}
