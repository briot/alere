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
                "account_num": a.number,
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
                "id": a.id,
                "name": a.name,
                "positive": a.name_when_positive,
                "negative": a.name_when_negative,
                "category": a.category,
                "is_work_income": a.is_work_income,
                "is_passive_income": a.is_passive_income,
                "is_unrealized": a.is_unrealized,
                "is_networth": a.is_networth,
                "is_stock": a.is_stock,
                "is_income_tax": a.is_income_tax,
                "is_misc_tax": a.is_misc_tax,
                "is_trading": a.is_trading,
            }
            for a in alere.models.AccountKinds.objects.all()
        ]

        return accounts, commodities, account_kinds, institutions
