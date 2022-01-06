from .json import JSONView
from .queries import Mean


class NetworthHistoryView(JSONView):

    def get_json(self, params):
        m = Mean(
            start=self.as_time(params, 'mindate'),
            end=self.as_time(params, 'maxdate'),
            currency_id=self.as_commodity_id(params, 'currency'),
            groupby=params.get('groupby'),
        )

        return [
            {
                "date": date,
                "networth": value,
            }
            for date, diff, avg, value in m.networth_history()
        ]
