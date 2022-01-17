import alere
import datetime
import alere.views.queries as queries
import alere.views.queries.ledger
import alere.views.queries.networth
from alere.views.queries.dates import DateSet
from .base_test import BaseTest, Split
from .utils import convert_time
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

    def test_networth(self) -> None:

        # No date specified
        a = queries.networth.networth(
            dates=DateSet.from_dates([]),
            currency=1,
            scenario=alere.models.Scenarios.NO_SCENARIO,
            max_scheduled_occurrences=0)
        self.assertEqual(a, [])

        # Date prior to all transactions
        a = queries.networth.networth(
            dates=DateSet.from_dates([convert_time('2010-11-20')]),
            currency=self.eur,
            scenario=alere.models.Scenarios.NO_SCENARIO,
            max_scheduled_occurrences=0)
        self.assertEqual(a, [])

        # Date in the middle of transactions
        self.assertEqual(
            queries.networth.networth(
                dates=DateSet.from_dates([convert_time('2020-11-02')]),
                currency=self.eur,
                scenario=alere.models.Scenarios.NO_SCENARIO,
                max_scheduled_occurrences=0),
            [
                {
                    'accountId': self.checking.id,
                    'price': [1.0],
                    'shares': [12.34],
                },
            ])

        # Date after the transactions
        self.assertEqual(
            queries.networth.networth(
                dates=DateSet.from_dates([convert_time('2020-11-20')]),
                currency=self.eur,
                scenario=alere.models.Scenarios.NO_SCENARIO,
                max_scheduled_occurrences=0),
            [
                {'accountId': self.checking.id,
                 'price': [1.0],
                 'shares': [3.34],
                },
            ])

        # Date after transactions in foreign currency
        self.assertEqual(
            queries.networth.networth(
                dates=DateSet.from_dates([convert_time('2020-11-26')]),
                currency=self.eur,
                scenario=alere.models.Scenarios.NO_SCENARIO,
                max_scheduled_occurrences=0),
            [
                {'accountId': self.checking.id,
                 'price': [1.0],
                 'shares': [1.54],
                },
            ])

        # Scenario 1, but no scheduled transactions
        self.assertEqual(
            queries.networth.networth(
                dates=DateSet.from_dates([convert_time('2022-11-26')]),
                currency=self.eur,
                max_scheduled_occurrences=0,
                scenario=self.scenario_1.id,
            ),
            [
                {'accountId': self.checking.id,
                 'price':  [1.0],
                 'shares': [1.54 + 2020],
                },
            ])

        # Planned networth. This includes scheduled transactions
        self.assertEqual(
            queries.networth.networth(
                dates=DateSet.from_dates([convert_time('2022-11-26')]),
                currency=self.eur,
                scenario=alere.models.Scenarios.NO_SCENARIO,
                max_scheduled_occurrences=2000,
            ),
            [
                {'accountId': self.checking.id,
                 'price':  [1.0],
                 'shares': [1.54 + 1010 * 25],
                },   # 25 months elapsed
            ])

    def test_ledger(self) -> None:
        def get_trans1(balance: float, date: str):
            return {
                'id': 1,
                'occ': 1,
                'date': date,
                'balance': balance,
                'balanceShares': balance,
                'memo': None,
                'checknum': None,
                'recurring': False,
                'splits': [
                    {
                        'accountId': self.checking.id,
                        'amount': 12.34,
                        'currency': 1,
                        'date': '2020-11-02',
                        'payee': None,
                        'price': 1.0,
                        'reconcile': 'n',
                        'shares': 12.34,
                    },
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
                ]
            }

        def get_trans2(balance: float, date: str):
            return {
                'id': 2,
                'occ': 1,
                'date': date,
                'balance': balance,
                'balanceShares': balance,
                'memo': None,
                'checknum': None,
                'recurring': False,
                'splits': [
                    {
                        'accountId': self.checking.id,
                        'date': '2020-11-04',
                        'currency': 1,
                        'amount': 1.0,
                        'payee': None,
                        'reconcile': 'n',
                        'shares': 1.0,
                        'price': 1.0
                    },
                    {
                        'accountId': self.salary.id,
                        'date': '2020-11-03',
                        'currency': 1,
                        'amount': -1.0,
                        'payee': None,
                        'reconcile': 'n',
                        'shares': -1.0,
                        'price': 1.0
                    },
                ]
            }

        def get_trans3(balance: float, date: str):
            return {
                'id': 3,
                'occ': 1,
                'date': date,
                'balance': balance,
                'balanceShares': balance,
                'memo': None,
                'checknum': None,
                'recurring': False,
                'splits': [
                    {
                        'accountId': self.checking.id,
                        'date': '2020-11-03',
                        'currency': 1,
                        'amount': -10.0,
                        'payee': None,
                        'reconcile': 'n',
                        'shares': -10.0,
                        'price': 1.0
                    },
                    {
                        'accountId': self.salary.id,
                        'date': '2020-11-03',
                        'currency': 1,
                        'amount': 10.0,
                        'payee': None,
                        'reconcile': 'n',
                        'shares': 10.0,
                        'price': 1.0
                    },
                ]
            }

        def get_trans4(balance: float, date: str):
            return {
                'id': 4,
                'occ': 1,
                'date': date,
                'balance': balance,
                'balanceShares': balance,   # EUR
                'memo': None,
                'checknum': None,
                'recurring': False,
                'splits': [
                    {
                        'accountId': self.checking.id,
                        'amount': -1.8,    # in EUR
                        'date': '2020-11-25',
                        'currency': 1,
                        'payee': None,
                        'price': 1.0,
                        'reconcile': 'n',
                        'shares': -1.8,    # in EUR
                    },
                    {
                        'accountId': self.groceries.id,
                        'amount': 1.802,   # in EUR
                        'date': '2020-11-25',
                        'currency': 2,
                        'payee': None,
                        'price': 0.85,     # conversion rate
                        'reconcile': 'n',
                        'shares': 2.12,    # in USD
                    },
                ]}

        def get_occurrence(occ: int, balance: float, date: str):
            return {
                'id': 5,   # First occurrence of the scheduled transaction
                'occ': occ,
                'date': date,
                'balance': balance,
                'balanceShares': balance,
                'memo': None,
                'checknum': None,
                'recurring': True,
                'splits': [
                    {
                        'accountId': self.checking.id,
                        'amount': 1010.0,
                        'date': date,
                        'currency': 1,
                        'payee': None,
                        'price': 1.0,
                        'reconcile': 'n',
                        'shares': 1010.0,    # in EUR
                    },
                    {
                        'accountId': self.salary.id,
                        'amount': -1010.0,
                        'date': date,
                        'currency': 1,
                        'payee': None,
                        'price': 1.0,
                        'reconcile': 'n',
                        'shares': -1010.0,
                    },
                 ]
            }

        # All scheduled transactions, and mindate is before any transaction
        self.assertListEqual(
            [
                get_trans1(       balance=12.34,   date='2020-11-01'),
                get_trans2(       balance=13.34,   date='2020-11-03'),
                get_trans3(       balance=3.34,    date='2020-11-03'),
                get_occurrence(1, balance=1013.34, date='2020-11-10'),
                get_trans4(       balance=1011.54, date='2020-11-25'),
                get_occurrence(2, balance=2021.54, date='2020-12-10'),
                get_occurrence(3, balance=3031.54, date='2021-01-10'),
            ],
            [
                trans.to_json()
                for trans in queries.ledger.ledger(
                    account_ids=[self.checking.id],
                    dates=DateSet.from_range(
                        start=convert_time('2010-01-01'),
                        end=convert_time('2021-02-01'),
                        granularity='months',   # irrelevant
                        max_scheduled_occurrences=2000,
                        scenario=alere.models.Scenarios.NO_SCENARIO,
                    ),
                    max_scheduled_occurrences=2000,
                    scenario=alere.models.Scenarios.NO_SCENARIO,
                )
            ],
        )

        # All scheduled transactions, but mindate is not the date of the
        # transaction. The balance should still be correct.
        self.assertListEqual(
            [
                get_occurrence(1, balance=1013.34, date='2020-11-10'),
                get_trans4(       balance=1011.54, date='2020-11-25'),
                get_occurrence(2, balance=2021.54, date='2020-12-10'),
                get_occurrence(3, balance=3031.54, date='2021-01-10'),
            ],
            [
                trans.to_json()
                for trans in queries.ledger.ledger(
                    account_ids=[self.checking.id],
                    dates=DateSet.from_range(
                        start=convert_time('2020-11-05'),
                        end=convert_time('2021-02-01'),
                        granularity='months',   # irrelevant
                        max_scheduled_occurrences=2000,
                        scenario=alere.models.Scenarios.NO_SCENARIO,
                    ),
                    max_scheduled_occurrences=2000,
                    scenario=alere.models.Scenarios.NO_SCENARIO,
                )
            ],
        )

        # Only the first occurrence of scheduled transactions
        self.assertListEqual(
            [
                get_occurrence(1, balance=1013.34, date='2020-11-10'),
                get_trans4(       balance=1011.54, date='2020-11-25'),
            ],
            [
                trans.to_json()
                for trans in queries.ledger.ledger(
                    account_ids=[self.checking.id],
                    dates=DateSet.from_range(
                        start=convert_time('2020-11-05'),
                        end=convert_time('2021-02-01'),
                        granularity='months',   # irrelevant
                        max_scheduled_occurrences=1,
                        scenario=alere.models.Scenarios.NO_SCENARIO,
                    ),
                    max_scheduled_occurrences=1,
                    scenario=alere.models.Scenarios.NO_SCENARIO,
                )
            ],
        )

        # No scheduled transactions
        self.assertListEqual(
            [
                get_trans4(balance=1.54, date='2020-11-25'),
            ],
            [
                trans.to_json()
                for trans in queries.ledger.ledger(
                    account_ids=[self.checking.id],
                    dates=DateSet.from_range(
                        start=convert_time('2020-11-05'),
                        end=convert_time('2021-02-01'),
                        granularity='months',   # irrelevant
                        max_scheduled_occurrences=0,
                        scenario=alere.models.Scenarios.NO_SCENARIO,
                    ),
                    max_scheduled_occurrences=0,
                    scenario=alere.models.Scenarios.NO_SCENARIO,
                )
            ],
        )
