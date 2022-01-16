from django.db.models import Sum, Q     # type: ignore
from .json import JSONView
import alere
import math
from alere.models import AccountKindCategory


class MetricsView(JSONView):

    def get_json(self, params):
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')
        currency = self.as_commodity_id(params, 'currency')

        include_scheduled = False
        scenario_id = alere.models.Scenarios.NO_SCENARIO

        over_period = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_commodity=currency) \
            .filter(
                Q(transaction__scenario=alere.models.Scenarios.NO_SCENARIO)
                | Q(transaction__scenario=scenario_id))

        if not include_scheduled:
            over_period = over_period.filter(transaction__scheduled=None)

        at_start = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=mindate,
                    maxdate__gt=mindate,
                    currency_id=currency,
                    scenario_id=scenario_id,
                    include_scheduled=include_scheduled)

        at_end = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=maxdate,
                    maxdate__gt=maxdate,
                    currency_id=currency,
                    scenario_id=scenario_id,
                    include_scheduled=include_scheduled)

        income = -(
            over_period
            .filter(
                account__kind__category=AccountKindCategory.INCOME,
                account__kind__is_unrealized=False,
            ).aggregate(value=Sum('value'))['value']
            or 0)

        passive_income = -(
            over_period
            .filter(account__kind__is_passive_income=True)
            .aggregate(value=Sum('value'))['value']
            or 0)

        work_income = -(
            over_period
            .filter(account__kind__is_work_income=True)
            .aggregate(value=Sum('value'))['value']
            or 0)

        expense = (
            over_period
            .filter(
                account__kind__category=AccountKindCategory.EXPENSE
            )
            .aggregate(value=Sum('value'))['value']
            or 0)

        other_taxes = (
            over_period
            .filter(account__kind__is_misc_tax=True)
            .aggregate(value=Sum('value'))['value']
            or 0)

        income_taxes = (
            over_period
            .filter(account__kind__is_income_tax=True)
            .aggregate(value=Sum('value'))['value']
            or 0)

        networth = (
            at_end
            .filter(account__kind__is_networth=True)
            .aggregate(value=Sum('balance'))['value']
            or 0)

        networth_start = (
            at_start
            .filter(account__kind__is_networth=True)
            .aggregate(value=Sum('balance'))['value']
            or 0)

        liquid_assets = (
            at_end
            .filter(
                account__kind__category=AccountKindCategory.EQUITY,
                account__kind__is_networth=True,
            )
            .aggregate(value=Sum('balance'))['value']
            or 0)

        liquid_assets_at_start = (
            at_start
            .filter(
                account__kind__category=AccountKindCategory.EQUITY,
                account__kind__is_networth=True,
            )
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
