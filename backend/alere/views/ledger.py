from .json import JSONView
from typing import List

class Split:
    def __init__(
            self, account: int, amount: int, reconcile='n',
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
            self, id, date, balance: int, splits: List[Split], payee='',
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

    def get_json(self, params, id):
        transactions = [
            Transaction(
                id=0,
                date="2020-06-01",
                payee="random payee",
                balance=800,
                splits=[
                    Split(account=3, amount=-200, reconcile="R"),
                    Split(account=1,
                          amount=200,
                          reconcile='n'),
                ]
            ),
            Transaction(
                id=1,
                date="2020-06-02",
                payee="copied from gnucash",
                balance=4500,
                splits=[
                    Split(account=4, amount=-4200, reconcile="n"),
                    Split(account=6, amount=500, reconcile="C"),
                    Split(account=1,
                          amount=3700,
                          reconcile="n"),
                ]
            ),
            Transaction(
                id=2,
                date="2020-06-02",
                payee="copied from gnucash",
                balance=8200,
                splits=[
                    Split(account=4, amount=-4200, reconcile="n"),
                    Split(account=6, amount=500, reconcile="n"),
                    Split(account=1,
                          amount=3700,
                          reconcile="R"),
                ]
            ),
            Transaction(
                id=3,
                date="2020-06-03",
                payee="with notes",
                balance=8300,
                notes="gift from X",
                splits=[
                    Split(account=5, amount=-100, reconcile="n"),
                    Split(account=1,
                          amount=100,
                          reconcile="C"),
                ]
            ),
        ]

        for j in range(0, 100):
           transactions.append(Transaction(
               id=j + 10,
               date='2020-06-04',
               payee='garage',
               balance=8200 - j * 100,
               splits=[
                   Split(account=3,
                         amount=100,
                         reconcile='n'),
                   Split(account=1,
                         amount=-100,
                         reconcile='R'),
                ]
            ))

        return transactions
