import alere.models
import datetime
from .means import MeanView
from .base_test import BaseTest, Split
from .utils import convert_time
from django.test import RequestFactory    # type: ignore


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
            scheduled="freq=MONTHLY;until=20210430",
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

    def test_balances(self):
        """
        Testing the alr_balances view
        """
        def b(account, balance: float, mindate: str, maxdate: str):
            return alere.models.Balances(
                account=account,
                commodity=self.eur,
                scenario=self.no_scenario,
                include_scheduled=include_scheduled,
                balance=balance,
                mindate=convert_time(mindate),
                maxdate=convert_time(maxdate),
            )

        include_scheduled = False
        self.assertSequenceEqual(
            alere.models.Balances.objects
            .filter(
                include_scheduled=include_scheduled,
                scenario=self.no_scenario)
            .order_by("account", "mindate").all(),
            [
                b(self.checking,   1234.0, "2020-11-02", "2020-11-03"),
                b(self.checking,   1224.0, "2020-11-03", "2020-11-05"),
                b(self.checking,   1324.0, "2020-11-05", "2999-12-31"),
                b(self.salary,    -1234.0, "2020-11-01", "2020-11-04"),
                b(self.salary,    -1334.0, "2020-11-04", "2999-12-31"),
                b(self.groceries,    10.0, "2020-11-03", "2999-12-31"),
            ]
        )

        include_scheduled = True
        self.assertSequenceEqual(
            alere.models.Balances.objects
            .filter(
                include_scheduled=True,
                scenario=self.no_scenario)
            .order_by("account", "mindate").all(),
            [
                b(self.checking,   1234.0, "2020-11-02", "2020-11-03"),
                b(self.checking,   1224.0, "2020-11-03", "2020-11-05"),
                b(self.checking,   1324.0, "2020-11-05", "2020-11-10"),
                b(self.checking,   2334.0, "2020-11-10", "2020-12-10"),
                b(self.checking,   3344.0, "2020-12-10", "2021-01-10"),
                b(self.checking,   4354.0, "2021-01-10", "2021-02-10"),
                b(self.checking,   5364.0, "2021-02-10", "2021-03-10"),
                b(self.checking,   6374.0, "2021-03-10", "2021-04-10"),
                b(self.checking,   7384.0, "2021-04-10", "2999-12-31"),

                b(self.salary,    -1234.0, "2020-11-01", "2020-11-04"),
                b(self.salary,    -1334.0, "2020-11-04", "2020-11-10"),
                b(self.salary,    -2344.0, "2020-11-10", "2020-12-10"),
                b(self.salary,    -3354.0, "2020-12-10", "2021-01-10"),
                b(self.salary,    -4364.0, "2021-01-10", "2021-02-10"),
                b(self.salary,    -5374.0, "2021-02-10", "2021-03-10"),
                b(self.salary,    -6384.0, "2021-03-10", "2021-04-10"),
                b(self.salary,    -7394.0, "2021-04-10", "2999-12-31"),

                b(self.groceries,    10.0, "2020-11-03", "2999-12-31"),
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

