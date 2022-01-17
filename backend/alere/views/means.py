from .json import JSONView
import alere
import alere.views.queries as queries
from alere.views.queries.dates import DateSet
from typing import Any


class MeanView(JSONView):

    def get_json(self, params, **kwargs: str) -> Any:
        max_scheduled_occurrences = 0   # no scheduled transactions
        scenario = alere.models.Scenarios.NO_SCENARIO

        dates = DateSet.from_range(
            start=self.as_time(params, 'mindate'),
            end=self.as_time(params, 'maxdate'),
            prior=int(params.get('prior', 6)),
            after=int(params.get('after', 6)),
            granularity='months',
            max_scheduled_occurrences=max_scheduled_occurrences,
            scenario=scenario,
        )

        result = {
            month: {
                "date": month,
                "value_expenses": -(exp or 0),
                "average_expenses": -(exp_avg or 0),
                "value_realized": -(income or 0),
                "average_realized": -(income_avg or 0),
            }
            for (month, income, income_avg, exp,
                    exp_avg) in queries.monthly_cashflow(
                dates=dates,
                currency=self.as_commodity_id(params, 'currency'),
                scenario=scenario,
                max_scheduled_occurrences=max_scheduled_occurrences,
            )
        }

        if self.as_bool(params, 'unrealized'):
            for date, diff, average, value in queries.networth_history(
                    dates=dates,
                    scenario=scenario,
                    currency=self.as_commodity_id(params, 'currency'),
                    max_scheduled_occurrences=max_scheduled_occurrences,
                    ):
                index = date[:7]  # only yyyy-mm
                if index in result:
                    result[index]["value_networth_delta"] = diff or 0
                    result[index]["average_networth_delta"] = average or 0

        return list(result.values())
