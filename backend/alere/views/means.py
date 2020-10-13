from django.db.models import F, Window, Avg, RowRange
from .json import JSONView
import alere


class MeanView(JSONView):

    def get_json(self, params):
        expenses = self.as_bool(params, 'expenses')
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')
        prior = int(params.get('prior', 6))
        after = int(params.get('after', 6))

        if expenses:
            kinds = ('Expense', )
            sign = 1.0
        else:
            kinds = ('Income', )
            sign = -1.0

        query = alere.models.By_Month.objects \
            .filter(date__gte=mindate,
                    date__lte=maxdate,
                    kind__name__in=kinds) \
            .values('date', 'value') \
            .annotate(average=Window(
                expression=Avg('value'),
                order_by=[F('date')],
                frame=RowRange(start=-prior, end=after),
            ))

        return [
            {
                "date": r['date'],
                "value": r['value'] * sign,
                "average": r['average'] * sign,
            }
            for r in query
        ]
