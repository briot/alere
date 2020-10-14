from .json import JSONView
import alere
import django.db


class LedgerView(JSONView):

    def get_json(self, params, id: str):
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')

        # When querying a single account, we'll compute the balance
        try:
            single_id = int(id)
        except:
            single_id = None

        q = alere.models.Splits_With_Value.objects \
            .select_related('transaction', 'account') \
            .order_by('transaction__timestamp', 'transaction_id')

        if id:
            # Find all splits that apply to the selected accounts. We want to
            # get all splits of involved transactions, so that the GUI can
            # display "other accounts" involved in the transaction.
            tr = alere.models.Splits.objects \
                .values_list('transaction_id', flat=True) \
                .filter(account_id__in=[int(i) for i in id.split(',')])
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
            if s.account_id == single_id:
                # balance += s.value

                # ??? Could we only divide at the end (but then the account
                # might not be the same)
                scaledBalanceShares += s.scaled_qty / s.account.commodity_scu
                balance = scaledBalanceShares * s.computed_price

            if current is None:
                current = {
                    "id": s.transaction_id,
                    "date": s.transaction.timestamp.strftime("%Y-%m-%d"),
                    "balance": 0,
                    "balanceShares": 0,
                    "memo": s.transaction.memo,
                    "payee": s.transaction.payee,
                    "checknum": s.transaction.check_number,
                    "splits": [],
                }

            current["splits"].append({
                "accountId": s.account_id,
                "date": s.post_date.strftime("%Y-%m-%d"),
                "amount": s.value,
                "reconcile": s.reconcile,
                "currency": s.account.commodity_id,
                "shares": s.scaled_qty / s.account.commodity_scu,
                "price": s.computed_price,
            })

        if current is not None:
            current["balance"] = balance
            current["balanceShares"] = scaledBalanceShares
            result.append(current)

        return result
