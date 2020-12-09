from django.db import models
from .json import JSONView
import alere


class AccountLists(alere.models.AlereModel):
    name = models.TextField()
    parent = models.ForeignKey(
        alere.models.Accounts, on_delete=models.DO_NOTHING, related_name='+'
    )
    last_reconciled = models.DateTimeField()
    opening_date = models.DateField()
    kind = models.ForeignKey(
        alere.models.AccountKinds,
        on_delete=models.DO_NOTHING,
        related_name='+')
    commodity = models.ForeignKey(
        alere.models.Commodities,
        on_delete=models.DO_NOTHING,
        related_name='+')
    commodity_scu = models.IntegerField()
    institution = models.ForeignKey(
        alere.models.Institutions,
        on_delete=models.DO_NOTHING,
        null=True,
        related_name='+')
    closed = models.BooleanField()
    iban = models.TextField()
    description = models.TextField()
    number = models.TextField()

    class Meta:
        db_table = "alr_accounts_list"
        managed = False

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "favorite": False,   # ???
            "commodityId": self.commodity_id,
            "commodity_scu": self.commodity_scu,
            "kindId": self.kind_id,
            "closed": self.closed,
            "iban": self.iban,
            "parent": self.parent_id,
            "description": self.description,
            "number": self.number,
            "opening_date": self.opening_date,
            "lastReconciled": (
                self.last_reconciled.date()
                if self.last_reconciled
                else None),
            "institution": self.institution_id,
        }


class AccountList(JSONView):
    def get_json(self, params):
        accounts = list(AccountLists.objects
            .select_related('kind', 'commodity').all())

        commodities = [
            {
                "id": c.id,
                "symbol_before": c.symbol_before,
                "symbol_after": c.symbol_after,
                "qty_scale": c.qty_scale,
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
            }
            for a in alere.models.AccountKinds.objects.all()
        ]

        return accounts, commodities, account_kinds, institutions
