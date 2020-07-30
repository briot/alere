from .json import JSONView
from typing import List, Union
from .kmm import kmm, do_query

class Split:
    def __init__(
            self, account: Union[int, str], amount: int, reconcile='n',
            currency=''):
        self.account = account
        self.amount = amount
        self.reconcile = reconcile
        self.currency = currency

    def to_json(self):
        return {
            "account": self.account,
            "amount": self.amount,
            "reconcile": self.reconcile,
            "currency": self.currency,
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
        query, params = kmm.query_ledger(
            accounts=[id]
        )
        return [
            Transaction(
                id=t.transactionId,
                date=t.date,
                payee=t.payee,
                balance=t.balance,
                splits=[
                    Split(
                        account=t.categoryId,
                        amount=t.value,
                        reconcile='n'
                    ),
                    Split(
                        account=t.accountId,
                        amount=-t.value,
                        reconcile='n'
                    ),
                ]
            )
            for t in do_query(query, params)
        ]
