from .json import JSONView
import alere
import alere.views.queries as queries
from alere.views.queries.dates import Dates
from typing import Any, Dict, Tuple


class MeanView(JSONView):

    def get_json(self, params, **kwargs: str) -> Any:
        max_scheduled_occurrences = 0   # no scheduled transactions
        scenario = alere.models.Scenarios.NO_SCENARIO

        dates = Dates(
            start=self.as_time(params, 'mindate'),
            end=self.as_time(params, 'maxdate'),
            granularity='months',
        )
        dates.restrict_to_splits(
            max_scheduled_occurrences=max_scheduled_occurrences,
            scenario=scenario,
        )

        # The "unrealized" part must be computed from variations in the
        # networth since the variation in prices, for instance, are not
        # recorded as explicit transaction.

        # month => (delta, average)
        unrealized: Dict[str, Tuple[float, float]] = {}

        if self.as_bool(params, "unrealized"):
            for date, diff, average, value in queries.networth_history(
                dates=dates,
                currency=self.as_commodity_id(params, 'currency'),
                scenario=scenario,
                max_scheduled_occurrences=max_scheduled_occurrences,
                prior=int(params.get('prior', 6)),
                after=int(params.get('after', 6)),
            ):
                month = date[:7]
                unrealized[month] = (diff or 0, average or 0)

        return [
            {
                "date": month,
                "value_expenses": -(exp or 0),
                "average_expenses": -(exp_avg or 0),
                "value_realized": -(realized_income or 0),
                "average_realized": -(realized_income_avg or 0),
                "value_networth_delta": (unrealized.get(month, (0, 0))[0]),
                "average_networth_delta": (unrealized.get(month, (0, 0))[1]),
                # "value_unrealized": -(unrealized_income or 0),
                # "average_unrealized": -(unrealized_income_avg or 0),
            }
            for (
                    month,
                    realized_income, realized_income_avg,
                    unrealized_income, unrealized_income_avg,
                    exp, exp_avg,
                ) in queries.monthly_cashflow(
                    dates=dates,
                    currency=self.as_commodity_id(params, 'currency'),
                    scenario=scenario,
                    max_scheduled_occurrences=max_scheduled_occurrences,
                    prior=int(params.get('prior', 6)),
                    after=int(params.get('after', 6)),
               )
        ]
