from django.db import models
from .json import JSONView
import alere


class AccountLists(alere.models.AlereModel):
    name = models.TextField()
    parent = models.ForeignKey(
        alere.models.Accounts, on_delete=models.DO_NOTHING, related_name='+'
    )
    last_reconciled = models.DateTimeField()
    kind = models.ForeignKey(
        alere.models.AccountKinds,
        on_delete=models.DO_NOTHING,
        related_name='+')
    commodity = models.ForeignKey(
        alere.models.Commodities,
        on_delete=models.DO_NOTHING,
        related_name='+')
    price_scale = models.IntegerField()
    institution = models.TextField()
    closed = models.BooleanField()
    iban = models.TextField()

    class Meta:
        db_table = "alr_accounts_list"
        managed = False

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "favorite": False,   # ???
            "commodityId": self.commodity_id,
            "kindId": self.kind_id,
            "closed": self.closed,
            "iban": self.iban,
            "parent": self.parent_id,
            "lastReconciled": self.last_reconciled,
            "priceScale": self.price_scale,
            "institution": self.institution,
        }


class AccountList(JSONView):
    def get_json(self, params):
        accounts = list(AccountLists.objects
            .select_related('kind', 'commodity').all())

        commodities = [
            {
                "id": c.id,
                "symb": c.symbol,
                "prefixed": c.prefixed,
                "qty_scale": c.qty_scale,
            }
            for c in alere.models.Commodities.objects.all()
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
            }
            for a in alere.models.AccountKinds.objects.all()
        ]

        return accounts, commodities, account_kinds
