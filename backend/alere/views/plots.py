from django.db.models import Sum, Q
from .json import JSONView
import alere


class CategoryPlotView(JSONView):

    def get_json(self, params):
        currency = self.as_commodity_id(params, 'currency')
        include_income = self.as_bool(params, 'income')
        include_expense = self.as_bool(params, 'expense')
        mindate = self.as_time(params, 'mindate')
        maxdate = self.as_time(params, 'maxdate')
        include_scheduled = False
        scenario = alere.models.Scenarios.NO_SCENARIO

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
            .filter(
                Q(transaction__scenario=alere.models.Scenarios.NO_SCENARIO)
                | Q(transaction__scenario=scenario)) \
            .values('account_id') \
            .annotate(Sum('value'))

        if not include_scheduled:
            query = query.filter(transaction__scheduled=None)

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
