from .json import JSONView
from .queries import Queries, Transaction_Descr
from typing import List, Optional, Any
import alere.models
import datetime
import django.db                    # type: ignore
from django.http import QueryDict   # type: ignore


def ledger(
        account_ids: Optional[List[int]],
        mindate: Optional[datetime.datetime],
        maxdate: Optional[datetime.datetime],
        max_scheduled_occurrences=1,
        ) -> List[Transaction_Descr]:
    q = Queries(
        start=mindate,
        end=maxdate,
        scenario_id=alere.models.Scenarios.NO_SCENARIO,
        max_scheduled_occurrences=max_scheduled_occurrences,
    )
    return list(q.ledger(account_ids=account_ids))


class LedgerView(JSONView):
    def get_json(self, params: QueryDict, **kwargs: str) -> Any:
        return ledger(
            account_ids=self.convert_to_int_list(kwargs['ids']),
            maxdate=self.as_time(params, 'maxdate'),
            mindate=self.as_time(params, 'mindate'),
        )
