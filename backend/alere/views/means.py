from .queries import Queries
from .json import JSONView
import alere


class MeanView(JSONView):

    def get_json(self, params):
        unrealized = self.as_bool(params, 'unrealized')

        m = Queries(
            start=self.as_time(params, 'mindate'),
            end=self.as_time(params, 'maxdate'),
            prior=int(params.get('prior', 6)),
            after=int(params.get('after', 6)),
            currency_id=self.as_commodity_id(params, 'currency'),
            max_scheduled_occurrences=0,   # no scheduled transactions
        )

        result = {
            month: {
                "date": month,
                "value_expenses": -(exp or 0),
                "average_expenses": -(exp_avg or 0),
                "value_realized": -(income or 0),
                "average_realized": -(income_avg or 0),
            }
            for month, income, income_avg, exp, exp_avg in m.monthly_cashflow()
        }

        if unrealized:
            for date, diff, average, value in m.networth_history():
                index = date[:7]  # only yyyy-mm
                if index in result:
                    result[index]["value_networth_delta"] = diff or 0
                    result[index]["average_networth_delta"] = average or 0

        return list(result.values())
