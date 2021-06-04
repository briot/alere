from .json import JSONView
import alere


class AccountList(JSONView):
    def get_json(self, params):
        accounts = [
            {
                "id": a.id,
                "name": a.name,
                "favorite": False,   # ???
                "commodityId": a.commodity_id,
                "commodity_scu": a.commodity_scu,
                "kindId": a.kind_id,
                "closed": a.closed,
                "iban": a.iban,
                "parent": a.parent_id,
                "description": a.description,
                "number": a.number,
                "opening_date": a.opening_date,
                "lastReconciled": (
                    a.last_reconciled.date()
                    if a.last_reconciled
                    else None),
                "institution": a.institution_id,
            }
            for a in alere.models.Accounts.objects.all()
        ]

        commodities = [
            {
                "id": c.id,
                "symbol_before": c.symbol_before,
                "symbol_after": c.symbol_after,
                "price_scale": c.price_scale,
                "name": c.name,
                "is_currency": c.kind == alere.models.CommodityKinds.CURRENCY,
            }
            for c in alere.models.Commodities.objects.all()
        ]

        institutions = [
            {
                "id": c.id,
                "name": c.name,
                "icon": c.icon,
            }
            for c in alere.models.Institutions.objects.all()
        ]

        account_kinds = [
            {
                "id": a.flag,
                "name": a.name,
                "positive": a.name_when_positive,
                "negative": a.name_when_negative,
                "is_stock": a.flag == alere.models.AccountFlags.STOCK,
                "is_asset": a.flag in alere.models.AccountFlags.networth(),
                "is_income_expense":
                   a.flag in alere.models.AccountFlags.expenses()
                   or a.flag in alere.models.AccountFlags.all_income(),
                "is_work_income":
                   a.flag in alere.models.AccountFlags.work_income(),
                "is_passive_income":
                   a.flag in alere.models.AccountFlags.passive_income(),
                "is_expense": a.flag in alere.models.AccountFlags.expenses(),
                "is_income_tax": a.flag in alere.models.AccountFlags.income_tax(),
                "is_other_tax": a.flag in alere.models.AccountFlags.misc_tax(),
                "is_realized_income":
                   a.flag in alere.models.AccountFlags.realized_income(),
                "is_unrealized_income":
                   a.flag in alere.models.AccountFlags.unrealized_income(),
            }
            for a in alere.models.AccountKinds.objects.all()
        ]

        return accounts, commodities, account_kinds, institutions
