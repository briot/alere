from django.db.models import Sum
from .json import JSONView
import alere

class MetricsView(JSONView):

    def get_json(self, params):
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')
        currency = params['currency']

        over_period = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_currency__iso_code=currency)

        at_start = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=mindate,
                    maxdate__gt=mindate,
                    commodity__iso_code=currency)

        at_end = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=maxdate,
                    maxdate__gt=maxdate,
                    commodity__iso_code=currency)


        income = -over_period \
            .filter(
                account__kind__in=alere.models.AccountFlags.actual_income()) \
            .aggregate(value=Sum('value'))['value']

        passive_income = -over_period \
            .filter(account__kind=alere.models.AccountFlags.PASSIVE_INCOME) \
            .aggregate(value=Sum('value'))['value']

        work_income = -over_period \
            .filter(account__kind=alere.models.AccountFlags.WORK_INCOME) \
            .aggregate(value=Sum('value'))['value']

        expense = over_period \
            .filter(account__kind__in=alere.models.AccountFlags.expenses()) \
            .aggregate(value=Sum('value'))['value']

        other_taxes = over_period \
            .filter(account__kind=alere.models.AccountFlags.MISC_TAX) \
            .aggregate(value=Sum('value'))['value']

        income_taxes = over_period \
            .filter(account__kind=alere.models.AccountFlags.INCOME_TAX) \
            .aggregate(value=Sum('value'))['value']

        networth = at_end \
            .filter(account__kind__in=alere.models.AccountFlags.networth()) \
            .aggregate(value=Sum('balance'))['value']

        networth_start = at_start \
            .filter(account__kind__in=alere.models.AccountFlags.networth()) \
            .aggregate(value=Sum('balance'))['value']

        liquid_assets = at_end \
            .filter(account__kind__in=alere.models.AccountFlags.liquid()) \
            .aggregate(value=Sum('balance'))['value']


        return {
            "income": income,
            "passive_income": passive_income,
            "work_income": work_income,
            "expenses": expense,
            "income_taxes": income_taxes,
            "other_taxes": other_taxes,
            "networth": networth,
            "networth_start": networth_start,
            "liquid_assets": liquid_assets,
        }
