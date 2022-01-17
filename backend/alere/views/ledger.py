from .json import JSONView
from typing import Any
import alere.models
import alere.views.queries as queries
import alere.views.queries.ledger
from alere.views.queries.dates import DateSet
from django.http import QueryDict   # type: ignore


class LedgerView(JSONView):
    def get_json(self, params: QueryDict, **kwargs: str) -> Any:
        scenario = alere.models.Scenarios.NO_SCENARIO
        max_scheduled_occurrences = 1

        return list(queries.ledger.ledger(
            dates=DateSet.from_range(
                start=self.as_time(params, 'mindate'),
                end=self.as_time(params, 'maxdate'),
                granularity='months',   # irrelevant
                scenario=scenario,
                max_scheduled_occurrences=max_scheduled_occurrences,
            ),
            account_ids=self.convert_to_int_list(kwargs['ids']),
            scenario=scenario,
            max_scheduled_occurrences=max_scheduled_occurrences,
        ))
