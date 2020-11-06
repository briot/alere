from .json import JSONView
from .queries import Mean


class NetworthHistoryView(JSONView):

    def get_json(self, params):
        m = Mean(
            start=self.as_time(params, 'mindate'),
            end=self.as_time(params, 'maxdate'),
            prior=int(params.get('prior', 6)),
            after=int(params.get('after', 6)),
            currency_id=self.as_commodity_id(params, 'currency'),
        )

        return [
            {
                "date": date,
                "networth": value,
            }
            for date, diff, avg, value in m.networth_history()
        ]
