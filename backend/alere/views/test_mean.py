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

