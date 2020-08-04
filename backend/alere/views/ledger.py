from .json import JSONView
from typing import List, Union
from .kmm import kmm, do_query

class Split:
    def __init__(
            self, account: Union[int, str], amount: int, reconcile='n',
            currency='', notes='', checknum=None):
        self.account = account
        self.amount = amount
        self.reconcile = reconcile
        self.currency = currency
        self.notes = notes
        self.checknum = checknum

    def to_json(self):
        return {
            "account": self.account,
            "amount": self.amount,
            "reconcile": self.reconcile,
            "currency": self.currency,
            "notes": self.notes,
            "checknum": self.checknum,
        }


class Transaction:
    def __init__(
            self, id: Union[int, str], date, balance: int,
            splits: List[Split],
            payee='',
            notes=''):
        self.id = id
        self.date = date
        self.payee = payee
        self.balance = balance
        self.splits = splits
        self.notes = notes

    def to_json(self):
        return {"id": self.id,
                "date": self.date,
                "payee": self.payee,
                "balance": self.balance,
                "splits": self.splits,
                "notes": self.notes
               }


class LedgerView(JSONView):

    def get_json(self, params, id: str):
        # ??? Should use kmm._query_detailed_splits
        query = (f"""
        SELECT
           t.id as transactionId,
           payee.name as payee,
           (CASE s.reconcileFlag
               WHEN '2' then 'R'
               WHEN '1' then 'C'
               ELSE ''
            END) as reconcile,
           {kmm._to_float('s.value')} as value,
           {kmm._to_float('s.shares')} as shares,
           {kmm._to_float('s.price')} as price,
           t.memo as transactionNotes,
           s.accountId,
           s.checkNumber,
           s.memo as notes,
           s.postDate as date,
           t.postDate as transactionDate
        FROM kmmTransactions t
           JOIN kmmSplits s on (s.transactionId = t.id)
           LEFT JOIN kmmPayees payee on (s.payeeId = payee.id)
        WHERE
           t.id IN (
               SELECT DISTINCT s2.transactionId
               FROM kmmSplits s2
               WHERE s2.accountId = :account
           )
        ORDER BY transactionDate, transactionId
        """)

        balance = 0.0
        result = []
        current = None

        for row in do_query(query, {'account': id}):
            if row.accountId == id:
                # ??? need to handle shares * price
                balance += row.value

            if current is not None and row.transactionId != current.id:
                result.append(current)
                current = None

            if current is None:
                current = Transaction(
                    id=row.transactionId,
                    date=row.transactionDate,
                    payee=row.payee,
                    balance=balance,
                    notes=row.transactionNotes,
                    splits=[]
                )

            current.splits.append(Split(
                account=row.accountId,
                amount=row.value,
                reconcile=row.reconcile,
                notes=row.notes,
                checknum=row.checkNumber,
            ))

        if current is not None:
            result.append(current)

        return result
