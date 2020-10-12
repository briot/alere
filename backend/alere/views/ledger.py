from .json import JSONView
import alere


class LedgerView(JSONView):

    def get_json(self, params, id: str):
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')

        # When querying a single account, we'll compute the balance
        try:
            single_id = int(id)
        except:
            single_id = None

        if id:
            # Find all splits that apply to the selected accounts
            tr = alere.models.Splits.objects \
                .values_list('transaction_id', flat=True) \
                .filter(account_id__in=[int(i) for i in id.split(',')])
        else:
            tr = None

        # Finally, from the transactions we can get all their splits. This
        # includes the ones we found in splits_in_accounts, but also the
        # splits that apply to other accounts (used to show target accounts
        # in the GUI)

        q = alere.models.Splits_With_Value.objects \
            .select_related('transaction', 'account') \
            .order_by('transaction__timestamp', 'transaction_id')

        if tr:
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
            # Compute the balance when there is a single account
            if s.account_id == single_id:
                balance += s.value
                scaledBalanceShares += s.scaled_qty

            if current is not None and s.transaction_id != current["id"]:
                current["balance"] = balance
                current["balanceShares"] = \
                    scaledBalanceShares / s.account.commodity_scu,
                result.append(current)
                current = None

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
            current["balanceShares"] = \
                scaledBalanceShares / s.account.commodity_scu,
            result.append(current)

        return result
