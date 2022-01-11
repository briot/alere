from django.db.models import Sum
from .json import JSONView
import alere
import math

class MetricsView(JSONView):

    def get_json(self, params):
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')
        currency = self.as_commodity_id(params, 'currency')

        over_period = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    transaction__scheduled=None,  # ignore scheduled ones
                    value_commodity=currency)

        at_start = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=mindate,
                    maxdate__gt=mindate,
                    currency_id=currency)

        at_end = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=maxdate,
                    maxdate__gt=maxdate,
                    currency_id=currency)

        income = -(
            over_period \
            .filter(
                account__kind__category=alere.models.AccountKindCategory.INCOME,
                account__kind__is_unrealized=False,
            ).aggregate(value=Sum('value'))['value']
            or 0)

        passive_income = -(
            over_period \
            .filter(account__kind__is_passive_income=True) \
            .aggregate(value=Sum('value'))['value']
            or 0)

        work_income = -(
            over_period \
            .filter(account__kind__is_work_income=True) \
            .aggregate(value=Sum('value'))['value']
            or 0)

        expense = (
            over_period \
            .filter(
                account__kind__category=alere.models.AccountKindCategory.EXPENSE
            ) \
            .aggregate(value=Sum('value'))['value']
            or 0)

        other_taxes = (
            over_period \
            .filter(account__kind__is_misc_tax=True) \
            .aggregate(value=Sum('value'))['value']
            or 0)

        income_taxes = (
            over_period \
            .filter(account__kind__is_income_tax=True) \
            .aggregate(value=Sum('value'))['value']
            or 0)

        networth = (
            at_end \
            .filter(account__kind__is_networth=True) \
            .aggregate(value=Sum('balance'))['value']
            or 0)

        networth_start = (
            at_start \
            .filter(account__kind__is_networth=True) \
            .aggregate(value=Sum('balance'))['value']
            or 0)

        liquid_assets = (
            at_end \
            .filter(
                account__kind__category=alere.models.AccountKindCategory.EQUITY,
                account__kind__is_networth=True,
            ) \
            .aggregate(value=Sum('balance'))['value']
            or 0)

        liquid_assets_at_start = (
            at_start \
            .filter(
                account__kind__category=alere.models.AccountKindCategory.EQUITY,
                account__kind__is_networth=True,
            ) \
            .aggregate(value=Sum('balance'))['value']
            or 0)

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
            "liquid_assets_at_start": liquid_assets_at_start,
        }
