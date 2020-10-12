from django.db.models import Sum
from .json import JSONView
import alere

class MetricsView(JSONView):

    def get_json(self, params):
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')
        currency = params['currency']

        # ??? Should have flags in accounts for those

        unrealized_gains_accounts = (
            150,    # Plus-value potentielle
        )

        passive_income_accounts = (
            10,     # allocations familiales
            9,      # dividendes
            170,    # heritage
            154,    # interets
        )

        work_income_accounts = (
            7,   # salaire Manu
            8,   # salaire Marie
            63,  # chomage
            163, # URSAFF
        )

        income_tax_accounts = (
            25,  # impots sur le revenu
        )

        other_tax_accounts = (
            22,   # impots
            23,   # taxe fonciere
            24,   # taxe habitation
            156,  # CSG
        )

        income = -alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_currency__iso_code=currency,
                    # ??? Should have a flag in account
                    account__kind__name="Income") \
            .exclude(account_id__in=unrealized_gains_accounts) \
            .aggregate(value=Sum('value'))['value']

        passive_income = -alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_currency__iso_code=currency,
                    account_id__in=passive_income_accounts) \
            .aggregate(value=Sum('value'))['value']

        work_income = -alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_currency__iso_code=currency,
                    account_id__in=work_income_accounts) \
            .aggregate(value=Sum('value'))['value']

        expense = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_currency__iso_code=currency,

                    # ??? Should have a flag in account
                    account__kind__name="Expense") \
            .aggregate(value=Sum('value'))['value']

        other_taxes = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_currency__iso_code=currency,
                    account_id__in=other_tax_accounts) \
            .aggregate(value=Sum('value'))['value']

        income_taxes = alere.models.Splits_With_Value.objects \
            .filter(post_date__gte=mindate,
                    post_date__lte=maxdate,
                    value_currency__iso_code=currency,
                    account_id__in=income_tax_accounts) \
            .aggregate(value=Sum('value'))['value']

        networth = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=maxdate,
                    maxdate__gt=maxdate,
                    commodity__iso_code=currency,
                    account__kind__name__in=('Asset',
                                             'Investment',
                                             'Stock',
                                             'Checking',
                                             'Liability',
                                             'Savings')) \
            .aggregate(value=Sum('balance'))['value']

        networth_start = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=mindate,
                    maxdate__gt=mindate,
                    commodity__iso_code=currency,
                    account__kind__name__in=('Asset',
                                             'Investment',
                                             'Stock',
                                             'Checking',
                                             'Liability',
                                             'Savings')) \
            .aggregate(value=Sum('balance'))['value']

        liquid_assets = alere.models.Balances_Currency.objects \
            .filter(mindate__lte=maxdate,
                    maxdate__gt=maxdate,
                    commodity__iso_code=currency,
                    account__kind__name__in=('Investment',
                                             'Liability',
                                             'Stock',
                                             'Checking',
                                             'Savings')) \
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
