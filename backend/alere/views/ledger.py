from .json import JSONView
from typing import List, Union
from .kmm import kmm, do_query

class Split:
    def __init__(
            self, accountId: Union[int, str], amount: int,
            shares: int, price: float, reconcile='n', payee='',
            currency='', memo='', checknum=None):
        self.accountId = accountId
        self.amount = amount
        self.reconcile = reconcile
        self.currency = currency
        self.memo = memo
        self.shares = shares
        self.payee = payee
        self.price = price
        self.checknum = checknum

    def to_json(self):
        return {
            "accountId": self.accountId,
            "amount": self.amount,
            "reconcile": self.reconcile,
            "currency": self.currency,
            "memo": self.memo,
            "shares": self.shares,
            "payee": self.payee,
            "price": self.price,
            "checknum": self.checknum,
        }


class Transaction:
    def __init__(
            self, id: Union[int, str], date,
            balance: int,
            balanceShares: int,
            splits: List[Split],
            memo=''):
        self.id = id
        self.date = date
        self.balance = balance
        self.balanceShares = balanceShares
        self.splits = splits
        self.memo = memo

    def to_json(self):
        return {"id": self.id,
                "date": self.date,
                "balance": self.balance,
                "balanceShares": self.balanceShares,
                "splits": self.splits,
                "memo": self.memo
               }


class LedgerView(JSONView):

    def get_json(self, params, id: str):
        accounts = id
        maxdate = params.get('maxdate', [None])[0]
        mindate = params.get('mindate', [None])[0]

        if id:
            # ??? Basic security, very wrong
            if ';' in id:
               return None
            accounts = id.split(',')
            if len(accounts) < 1:
                accounts = id

        check_date = ''
        if maxdate:
            check_date = "AND s.postDate <= :maxdate"

        # ??? Should use kmm._query_detailed_splits
        query = (f"""
        SELECT
           t.id as transactionId,
           COALESCE (payee.name, s.action) as payee,
           (CASE s.reconcileFlag
               WHEN '2' then 'R'
               WHEN '1' then 'C'
               ELSE ''
            END) as reconcile,
           {kmm._to_float('s.value')} as value,
           {kmm._to_float('s.shares')} as shares,
           {kmm._to_float('s.price')} as price,
           t.memo as transactionMemo,
           s.accountId,
           s.checkNumber,
           s.memo,
           s.postDate as date,
           t.postDate as transactionDate
        FROM kmmTransactions t
           JOIN kmmSplits s on (s.transactionId = t.id)
           LEFT JOIN kmmPayees payee on (s.payeeId = payee.id)
        WHERE
           t.id IN (
               SELECT DISTINCT s2.transactionId
               FROM kmmSplits s2
               WHERE TRUE {kmm._test_accounts('s2', accounts)}
           ) {check_date}
        ORDER BY transactionDate, transactionId
        """)

        params = {
            'maxdate': maxdate,
        }

        balance = 0.0
        balanceShares = 0.0
        result = []
        current = None

        for row in do_query(query, params):
            # We can only skip now, because early rows are needed to compute
            # the balance
            if mindate and row.date < mindate:
                continue

            if row.accountId == id:
                # ??? need to handle shares * price
                balance += row.value
                balanceShares += row.shares

            if current is not None and row.transactionId != current.id:
                result.append(current)
                current = None

            if current is None:
                current = Transaction(
                    id=row.transactionId,
                    date=row.transactionDate,
                    balance=balance,
                    balanceShares=balanceShares,
                    memo=row.transactionMemo,
                    splits=[]
                )

            current.splits.append(Split(
                accountId=row.accountId,
                amount=row.value,
                reconcile=row.reconcile,
                shares=row.shares,
                price=
                   float(row.price)
                   if row.price
                   else None,

                # workaround issue in kmymoney, which always uses "BUY" for
                # action even though it was a SELL
                payee=
                  ("Sell"
                   if row.payee == "Buy" and row.shares < 0
                   else row.payee),

                memo=row.memo,
                checknum=row.checkNumber,
            ))
            current.balance = balance
            current.balanceShares = balanceShares

        if current is not None:
            result.append(current)

        return result
