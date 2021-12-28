from django.db.models import Sum
from .json import JSONView
import alere


class CategoryPlotView(JSONView):

    def get_json(self, params, expenses: str):
        currency = self.as_commodity_id(params, 'currency')

        is_expenses = expenses == "expenses"

        accounts = None
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')

        if is_expenses:
            order_by = '-value__sum'
            category = alere.models.AccountKindCategory.EXPENSE
        else:
            order_by = 'value__sum'
            category = alere.models.AccountKindCategory.INCOME

        query = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_commodity_id=currency,
                    account__kind__category=category,
                    account__kind__is_unrealized=False) \
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
