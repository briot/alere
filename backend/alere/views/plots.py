from django.db.models import Sum
from .json import JSONView
import alere


class CategoryPlotView(JSONView):

    def get_json(self, params):
        currency = self.as_commodity_id(params, 'currency')
        include_income = self.as_bool(params, 'income')
        include_expense = self.as_bool(params, 'expense')
        mindate = self.as_time(params, 'mindate')
        maxdate = self.as_time(params, 'maxdate')

        accounts = None

        categories = []
        if include_expense:
            categories.append(alere.models.AccountKindCategory.EXPENSE)
        if include_income:
            categories.append(alere.models.AccountKindCategory.INCOME)

        query = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_commodity_id=currency,
                    account__kind__category__in=categories,
                    account__kind__is_unrealized=False) \
            .values('account_id') \
            .annotate(Sum('value'))

        return {
            "mindate": mindate,
            "maxdate": maxdate,
            "items": [
                {
                    "accountId": a['account_id'],
                    "value": -a['value__sum'],
                }
                for a in query
            ]
        }
