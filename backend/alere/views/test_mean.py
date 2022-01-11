import alere
import datetime
from .means import MeanView
from .base_test import BaseTest, Split
from django.test import RequestFactory


class PlotTestCase(BaseTest):

    def setUp(self):
        super().setUp()
        self.create_transaction(
            [Split(self.salary,  -123400, '2020-11-01'),
             Split(self.checking, 123400, '2020-11-02')])
        self.create_transaction(
            [Split(self.groceries, 1000, '2020-11-03'),
             Split(self.checking, -1000, '2020-11-03')])
        self.create_transaction(
            [Split(self.salary,  -10000, '2020-11-04'),
             Split(self.checking, 10000, '2020-11-05')])

        # Create a scheduled transaction, which should be ignored in all
        # results below.
        self.create_transaction(
            scheduled="freq=DAILY",
            splits=[
                Split(self.salary,  -101000, '2020-11-10'),
                Split(self.checking, 101000, '2020-11-12'),
            ])

    def test_balances(self):
        # Testing the alr_balances view
        self.assertListEqual(
            list(
                alere.models.Balances.objects
                .order_by("account", "mindate").all()
            ),
            [
                alere.models.Balances(
                    account=self.checking,
                    commodity=self.eur,
                    balance=1234.0,
                    mindate=self.convert_time("2020-11-02"),
                    maxdate=self.convert_time("2020-11-03"),
                ),
                alere.models.Balances(
                    account=self.checking,
                    commodity=self.eur,
                    balance=1224.0,
                    mindate=self.convert_time("2020-11-03"),
                    maxdate=self.convert_time("2020-11-05"),
                ),
                alere.models.Balances(
                    account=self.checking,
                    commodity=self.eur,
                    balance=1324.0,
                    mindate=self.convert_time("2020-11-05"),
                    maxdate=self.convert_time("2999-12-31"),
                ),
                alere.models.Balances(
                    account=self.salary,
                    commodity=self.eur,
                    balance=-1234.0,
                    mindate=self.convert_time("2020-11-01"),
                    maxdate=self.convert_time("2020-11-04"),
                ),
                alere.models.Balances(
                    account=self.salary,
                    commodity=self.eur,
                    balance=-1334.0,
                    mindate=self.convert_time("2020-11-04"),
                    maxdate=self.convert_time("2999-12-31"),
                ),
                alere.models.Balances(
                    account=self.groceries,
                    commodity=self.eur,
                    balance=10.0,
                    mindate=self.convert_time("2020-11-03"),
                    maxdate=self.convert_time("2999-12-31"),
                ),
            ]
        )

    def test_mean(self):
        req = RequestFactory().get(
            '/api/mean',
            {
                "mindate": '2020-01-01',
                "maxdate": '2020-12-01',
                "prio": 2,
                "after": 2,
                "unrealized": "true",
                "currency": self.eur.id,
            })
        view = MeanView()
        self.assertListEqual(
            [
                {
                    'average_expenses': -10.0,
                    'average_networth_delta': 0,
                    'average_realized': 1334.0,
                    'date': '2020-11',
                    'value_expenses': -10.0,
                    'value_networth_delta': 0,
                    'value_realized': 1334.0,
                }
            ],
            view.get_json(req.GET),
        )

