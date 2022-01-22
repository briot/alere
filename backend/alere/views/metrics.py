from django.db.models import Sum, Q     # type: ignore
import django.db    # type: ignore
from .json import JSONView
import alere
import math
import alere.models
from alere.models import AccountKindCategory
from alere.views.queries.dates import DateValues, DateRange
from alere.views.queries.networth import networth, Per_Account
from alere.views.queries.splits import splits_with_values
from typing import List, Dict, Callable


def compute_networth(
        all_networth: List[Per_Account],
        accounts: Dict[int, alere.models.Accounts],
        filter: Callable[[alere.models.Accounts], bool],
        idx: int,
        ) -> float:

    accs = [
        nw
        for nw in all_networth
        if filter(accounts[nw['accountId']])
        and nw['shares'][idx] is not None
        and nw['price'][idx] is not None
    ]

    if accs:
        return sum(nw['shares'][idx] * nw['price'][idx] for nw in accs)
    else:
        return 0


class MetricsView(JSONView):

    def get_json(self, params):
        maxdate = self.as_date(params, 'maxdate')
        mindate = self.as_date(params, 'mindate')
        currency = self.as_commodity_id(params, 'currency')

        include_scheduled = False
        scenario_id = alere.models.Scenarios.NO_SCENARIO

        all_networth = networth(
            dates=DateValues(dates=[mindate, maxdate]),
            currency=currency,
            scenario=scenario_id,
            max_scheduled_occurrences=0,
        )
        over_period = splits_with_values(
            dates=DateRange(start=mindate, end=maxdate),
            currency=currency,
            scenario=scenario_id,
            max_scheduled_occurrences=0,
        )
        accounts = {
            a.id: a
            for a in alere.models.Accounts.objects.select_related('kind')
        }

        networth_start = compute_networth(
            all_networth,
            accounts,
            lambda acc: acc.kind.is_networth,
            0)
        networth_end = compute_networth(
            all_networth,
            accounts,
            lambda acc: acc.kind.is_networth,
            1)
        liquid_assets_at_start = compute_networth(
            all_networth,
            accounts,
            lambda acc: (
                acc.kind.category == AccountKindCategory.EQUITY
                and acc.kind.is_networth
            ),
            0)
        liquid_assets = compute_networth(
            all_networth,
            accounts,
            lambda acc: (
                acc.kind.category == AccountKindCategory.EQUITY
                and acc.kind.is_networth
            ),
            1)
        income = -sum(
            value
            for account_id, value in over_period.items()
            if accounts[account_id].kind.category == AccountKindCategory.INCOME
            and not accounts[account_id].kind.is_unrealized
        )
        passive_income = -sum(
            value
            for account_id, value in over_period.items()
            if accounts[account_id].kind.is_passive_income
        )
        work_income = -sum(
            value
            for account_id, value in over_period.items()
            if accounts[account_id].kind.is_work_income
        )
        expense = sum(
            value
            for account_id, value in over_period.items()
            if accounts[account_id].kind.category ==
                AccountKindCategory.EXPENSE
        )
        other_taxes = sum(
            value
            for account_id, value in over_period.items()
            if accounts[account_id].kind.is_misc_tax
        )
        income_taxes = sum(
            value
            for account_id, value in over_period.items()
            if accounts[account_id].kind.is_income_tax
        )
        return {
            "income": income,
            "passive_income": passive_income,
            "work_income": work_income,
            "expenses": expense,
            "income_taxes": income_taxes,
            "other_taxes": other_taxes,
            "networth": networth_end,
            "networth_start": networth_start,
            "liquid_assets": liquid_assets,
            "liquid_assets_at_start": liquid_assets_at_start,
        }
