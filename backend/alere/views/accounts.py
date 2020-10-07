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
            "currencyId": self.commodity_id,
            "currencySymbol": self.commodity.symbol,
            "currencyPrefixed": self.commodity.prefixed,
            "accountType": self.kind.name,
            "closed": self.closed,
            "iban": self.iban,
            "parent": self.parent_id,
            "lastReconciled": self.last_reconciled,
            # "forOpeningBalances": self.forOpeningBalances,
            "sharesScale": self.commodity.qty_scale,
            "priceScale": self.price_scale,
            "institution": self.institution,
        }


class AccountList(JSONView):
    def get_json(self, params):
        return list(AccountLists.objects
            .select_related('kind', 'commodity').all())
