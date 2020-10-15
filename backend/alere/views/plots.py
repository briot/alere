from django.db.models import Sum
from .json import JSONView
import alere


class CategoryPlotView(JSONView):

    def get_json(self, params, expenses: str):
        is_expenses = expenses == "expenses"

        accounts = None
        currency = "EUR"
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')

        if is_expenses:
            flags = alere.models.AccountFlags.expenses()
            order_by = '-value__sum'
        else:
            flags = alere.models.AccountFlags.all_income()
            order_by = 'value__sum'

        query = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    account__kind__in=flags) \
            .values('account_id') \
            .annotate(Sum('value')) \
            .order_by(order_by)

        return {
            "mindate": mindate,
            "maxdate": maxdate,
            "items": [
                {
                    "accountId": a['account_id'],
                    "value":
                       a['value__sum'] if is_expenses else -a['value__sum'],
                }
                for a in query
            ]
        }
