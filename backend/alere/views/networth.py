import alere.models
from django.http import QueryDict     # type: ignore
from .json import JSONView
import alere.views.queries as queries
import alere.views.queries.networth
from alere.views.queries.dates import DateSet
from typing import Any


class NetworthView(JSONView):

    def get_json(self, params: QueryDict, **kwargs: str) -> Any:
        return queries.networth.networth(
            dates=DateSet.from_dates(self.as_time_list(params, 'dates') or []),
            currency=self.as_commodity_id(params, 'currency'),
            scenario=alere.models.Scenarios.NO_SCENARIO,
            max_scheduled_occurrences=None,
        )
