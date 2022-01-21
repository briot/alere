import alere.models
from django.http import QueryDict     # type: ignore
from .json import JSONView
import alere.views.queries as queries
import alere.views.queries.networth
from alere.views.queries.dates import DateValues
from typing import Any


class NetworthView(JSONView):

    def get_json(self, params: QueryDict, **kwargs: str) -> Any:
        return queries.networth.networth(
            dates=DateValues(self.as_time_list(params, 'dates')),
            currency=self.as_commodity_id(params, 'currency'),
            scenario=alere.models.Scenarios.NO_SCENARIO,
            max_scheduled_occurrences=(
                None
                if self.as_bool(params, 'scheduled')
                else 0
            ),
        )
