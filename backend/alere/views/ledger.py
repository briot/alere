from .json import JSONView
from django.db.models import Q
from typing import Union, List
import alere
import datetime
import django.db
import math


def ledger(
        ids: List[int],
        mindate: datetime.datetime,
        maxdate: datetime.datetime,
    ):
    q = alere.models.Splits_With_Value.objects \
        .select_related('transaction', 'account', 'payee') \
        .order_by('transaction__timestamp', 'transaction_id')

    if ids:
        # Find all splits that apply to the selected accounts. We want to
        # get all splits of involved transactions, so that the GUI can
        # display "other accounts" involved in the transaction.
        tr = alere.models.Splits.objects \
            .values_list('transaction_id', flat=True) \
            .filter(account_id__in=ids)

        q = q.filter(transaction_id__in=tr)

    if mindate:
        # ??? To compute balance we should not skip old splits
        q = q.filter(post_date__gte=mindate)
    if maxdate:
        q = q.filter(post_date__lte=maxdate)

    balance = 0.0
    scaledBalanceShares = 0.0
    result = []
    current = None

    for s in q:
        if current is not None and s.transaction_id != current["id"]:
            current["balance"] = balance
            current["balanceShares"] = scaledBalanceShares
            result.append(current)
            current = None

        # Compute the balance when there is a single account
        if len(ids) == 1 and s.account_id == ids[0]:
            # balance += s.value

            # ??? Could we only divide at the end (but then the account
            # might not be the same)
            scaledBalanceShares += s.scaled_qty / s.account.commodity_scu

            balance = (
                scaledBalanceShares * s.computed_price
                if s.computed_price is not None
                else None
            )

        if current is None:
            current = {
                "id": s.transaction_id,
                "date": s.transaction.timestamp.strftime("%Y-%m-%d"),
                "balance": 0,
                "balanceShares": 0,
                "memo": s.transaction.memo,
                "checknum": s.transaction.check_number,
                "splits": [],
            }

        current["splits"].append({
            "accountId": s.account_id,
            "date": s.post_date.strftime("%Y-%m-%d"),
            "amount": s.value,
            "currency": s.value_commodity_id,
            "reconcile": s.reconcile,
            "shares": s.scaled_qty / s.account.commodity_scu,
            "price": s.computed_price,
            "payee": s.payee.name if s.payee else None,
        })

    if current is not None:
        current["balance"] = balance
        current["balanceShares"] = scaledBalanceShares
        result.append(current)

    return result


class LedgerView(JSONView):
    def get_json(self, params, ids: str):
        return ledger(
            ids=self.convert_to_int_list(ids),
            maxdate=self.as_time(params, 'maxdate'),
            mindate=self.as_time(params, 'mindate'),
        )
