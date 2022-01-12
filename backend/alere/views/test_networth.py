import alere
import datetime
from .ledger import ledger
from .networth import networth
from .base_test import BaseTest, Split
from typing import List, Tuple


class NetworthTestCase(BaseTest):

    def setUp(self):
        super().setUp()

        self.create_transaction(
            [Split(self.salary,  -1234, '2020-11-01'),
             Split(self.checking, 1234, '2020-11-02')])
        self.create_transaction(
            [Split(self.salary,  -100, '2020-11-03'),
             Split(self.checking, 100, '2020-11-04')])
        self.create_transaction(
            [Split(self.salary,    1000, '2020-11-03'),
             Split(self.checking, -1000, '2020-11-03')])

        # A transaction in a foreign currency.
        # xrate:  1 USD = 0.85 EUR
        # bought 2.12 USD  (price_scale is 1000)
        # equivalent to 1.802 EUR (qty_scale is 100)
        self.create_transaction(
            [Split(
                self.groceries,
                212,   # scaled by groceries'commodity (EUR), i.e. 100
                '2020-11-25',
                value_commodity=self.usd,
                value=1802,
             ),
             Split(self.checking,  -180, '2020-11-25')])

        # Create a scheduled transaction, which should be ignored in all
        # results below by default.
        self.create_transaction(
            scheduled="freq=MONTHLY",
            splits=[
                Split(self.salary,  -101000, '2020-11-10'),
                Split(self.checking, 101000, '2020-11-12'),
            ])

        # A transaction from a different scenario, should also be ignored
        # in general.
        self.create_transaction(
            scenario=self.scenario_1,
            splits=[
                Split(self.salary,  -202000, '2020-11-10'),
                Split(self.checking, 202000, '2020-11-12'),
            ])

    def test_networth(self):

        # No date specified
        a = networth(dates=[], currency_id=1)
        self.assertEqual(a, [])

        # Date prior to all transactions
        a = networth(
            dates=[self.convert_time('2010-11-20')],
            currency_id=self.eur)
        self.assertEqual(a, [])

        # Date in the middle of transactions
        self.assertEqual(
            networth(
                dates=[self.convert_time('2020-11-02')],
                currency_id=self.eur),
            [
                {'accountId': self.checking.id,
                 'price': [1.0], 'shares': [12.34]},
            ])

        # Date after the transactions
        self.assertEqual(
            networth(
                dates=[self.convert_time('2020-11-20')],
                currency_id=self.eur),
            [
                {'accountId': self.checking.id,
                 'price': [1.0], 'shares': [3.34]},
            ])

        # Date after transactions in foreign currency
        self.assertEqual(
            networth(
                dates=[self.convert_time('2020-11-26')],
                currency_id=self.eur),
            [
                {'accountId': self.checking.id,
                 'price': [1.0], 'shares': [1.54]},
            ])

        # Scenario 1
        self.assertEqual(
            networth(
                dates=[self.convert_time('2022-11-26')],
                currency_id=self.eur,
                scenario=self.scenario_1.id,
            ),
            [
                {'accountId': self.checking.id,
                 'price':  [1.0],
                 'shares': [1.54 + 2020]},
            ])

        # Planned networth. This includes scheduled transactions
        self.assertEqual(
            networth(
                dates=[self.convert_time('2022-11-26')],
                currency_id=self.eur,
                include_scheduled=True,
            ),
            [
                {'accountId': self.checking.id,
                 'price':  [1.0],
                 'shares': [1.54 + 1010 * 25]},   # 25 months elapsed
            ])

    def test_ledger(self):
        self.assertEqual(
            [
                {'id': 1,
                 'date': '2020-11-01',
                 'balance': 12.34,
                 'balanceShares': 12.34,
                 'memo': None,
                 'checknum': None,
                 'splits': [
                     {
                         'accountId': self.salary.id,
                         'amount': -12.34,
                         'currency': 1,
                         'date': '2020-11-01',
                         'payee': None,
                         'price': 1.0,
                         'reconcile': 'n',
                         'shares': -12.34,
                     },
                     {'accountId': self.checking.id,
                      'amount': 12.34,
                      'currency': 1,
                      'date': '2020-11-02',
                      'payee': None,
                      'price': 1.0,
                      'reconcile': 'n',
                      'shares': 12.34,
                      }
                ]},
                {'id': 2,
                 'date': '2020-11-03',
                 'balance': 13.34,
                 'balanceShares': 13.34,
                 'memo': None,
                 'checknum': None,
                 'splits': [
                     {'accountId': self.salary.id,
                      'date': '2020-11-03',
                      'currency': 1,
                      'amount': -1.0,
                      'payee': None,
                      'reconcile': 'n',
                      'shares': -1.0,
                      'price': 1.0
                     },
                     {'accountId': self.checking.id,
                      'date': '2020-11-04',
                      'currency': 1,
                      'amount': 1.0,
                      'payee': None,
                      'reconcile': 'n',
                      'shares': 1.0,
                      'price': 1.0
                     }
                ]},
                {'id': 3,
                 'date': '2020-11-03',
                 'balance': 3.34,
                 'balanceShares': 3.34,
                 'memo': None,
                 'checknum': None,
                 'splits': [
                     {'accountId': self.salary.id,
                      'date': '2020-11-03',
                      'currency': 1,
                      'amount': 10.0,
                      'payee': None,
                      'reconcile': 'n',
                      'shares': 10.0,
                      'price': 1.0
                      },
                     {'accountId': self.checking.id,
                      'date': '2020-11-03',
                      'currency': 1,
                      'amount': -10.0,
                      'payee': None,
                      'reconcile': 'n',
                      'shares': -10.0,
                      'price': 1.0
                      }
                ]},
                {'id': 4,
                 'date': '2020-11-25',
                 'balance': 1.5399999999999998,
                 'balanceShares': 1.5399999999999998,   # 1.54 EUR
                 'memo': None,
                 'checknum': None,
                 'splits': [
                     {'accountId': self.groceries.id,
                      'amount': 1.802,   # in EUR
                      'date': '2020-11-25',
                      'currency': 2,
                      'payee': None,
                      'price': 0.85,     # conversion rate
                      'reconcile': 'n',
                      'shares': 2.12,    # in USD
                      },
                     {'accountId': self.checking.id,
                      'amount': -1.8,    # in EUR
                      'date': '2020-11-25',
                      'currency': 1,
                      'payee': None,
                      'price': 1.0,
                      'reconcile': 'n',
                      'shares': -1.8,    # in EUR
                     }
                ]}
            ],
            ledger(
                ids=[self.checking.id],
                mindate=self.convert_time('2010-01-01'),
                maxdate=self.convert_time('2999-01-01'),
            )
        )
