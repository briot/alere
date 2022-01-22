from alere.views.queries.splits import splits_with_values
from alere.views.queries.dates import DateRange
from .json import JSONView
import alere.models


class CategoryPlotView(JSONView):

    def get_json(self, params):
        include_income = self.as_bool(params, 'income')
        include_expense = self.as_bool(params, 'expense')
        mindate = self.as_time(params, 'mindate')
        maxdate = self.as_time(params, 'maxdate')

        categories = []
        if include_expense:
            categories.append(alere.models.AccountKindCategory.EXPENSE)
        if include_income:
            categories.append(alere.models.AccountKindCategory.INCOME)

        per_account = splits_with_values(
            dates=DateRange(mindate, maxdate),
            currency=self.as_commodity_id(params, 'currency'),
            scenario=alere.models.Scenarios.NO_SCENARIO,
            max_scheduled_occurrences=0,
        )
        accounts = {
            a.id: a
            for a in alere.models.Accounts.objects.select_related('kind')
        }

        return {
            "mindate": mindate,
            "maxdate": maxdate,
            "items": [
                {
                    "accountId": account_id,
                    "value": -val,
                }
                for account_id, val in per_account.items()
                if accounts[account_id].kind.category in categories
                and not accounts[account_id].kind.is_unrealized
            ]
        }
