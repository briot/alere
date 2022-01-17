from django.http import QueryDict    # type: ignore
from .json import JSONView
from typing import Any
import alere.models
import alere.views.queries as queries
from alere.views.queries.dates import DateSet


class NetworthHistoryView(JSONView):

    def get_json(self, params: QueryDict, **kwargs: str) -> Any:
        max_scheduled_occurrences = None   # include all scheduled
        scenario = alere.models.Scenarios.NO_SCENARIO

        return [
            {
                "date": date,
                "networth": value,
            }
            for date, diff, avg, value in queries.networth_history(
                dates=DateSet.from_range(
                    start=self.as_time(params, 'mindate'),
                    end=self.as_time(params, 'maxdate'),
                    prior=0,
                    after=0,
                    granularity=params.get('groupby'),
                    max_scheduled_occurrences=max_scheduled_occurrences,
                    scenario=scenario,
                ),
                currency=self.as_commodity_id(params, 'currency'),
                scenario=scenario,
                max_scheduled_occurrences=max_scheduled_occurrences,
            )
        ]
