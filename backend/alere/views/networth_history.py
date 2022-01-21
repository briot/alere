from django.http import QueryDict    # type: ignore
from .json import JSONView
from typing import Any
import alere.models
import alere.views.queries as queries
from alere.views.queries.dates import Dates


class NetworthHistoryView(JSONView):

    def get_json(self, params: QueryDict, **kwargs: str) -> Any:
        max_scheduled_occurrences = None   # include all scheduled
        scenario = alere.models.Scenarios.NO_SCENARIO
        dates = Dates(
            start=self.as_time(params, 'mindate'),
            end=self.as_time(params, 'maxdate'),
            granularity=params.get('groupby'),
        )
        dates.restrict_to_splits(
            max_scheduled_occurrences=max_scheduled_occurrences,
            scenario=scenario,
        )

        return [
            {
                "date": date,
                "networth": value,
            }
            for date, diff, avg, value in queries.networth_history(
                dates=dates,
                currency=self.as_commodity_id(params, 'currency'),
                scenario=scenario,
                max_scheduled_occurrences=max_scheduled_occurrences,
            )
        ]
