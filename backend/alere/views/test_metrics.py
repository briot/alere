import alere
from .metrics import MetricsView
from .base_test import BaseTest, Split
from django.test import RequestFactory


class MetricsTestCase(BaseTest):

    def setUp(self):
        super().setUp()

        self.create_transaction(
            [Split(self.salary,  -123400, '2020-11-01'),
             Split(self.checking, 123400, '2020-11-02')])
        self.create_transaction(
            [Split(self.salary,  -10000, '2020-11-03'),
             Split(self.checking, 10000, '2020-11-04')])
        self.create_transaction(
            [Split(self.groceries, 1000, '2020-11-03'),
             Split(self.checking, -1000, '2020-11-03')])

        # Create a scheduled transaction, which should be ignored in all
        # results below.
        self.create_transaction(
            scheduled="freq=DAILY",
            splits=[
                Split(self.salary,  -101000, '2020-11-10'),
                Split(self.checking, 101000, '2020-11-12'),
            ])

    def test_metrics(self):
        req = RequestFactory().get(
            '/api/metrics',
            {
                "mindate": '2020-01-01',
                "maxdate": '2020-12-01',
                "currency": self.eur.id,
            })
        view = MetricsView()
        self.assertDictEqual(
            {
                'expenses': 10.0,   # groceries
                'income': 1334.0,   # salary
                'income_taxes': 0,
                'liquid_assets': 1324.0,
                'liquid_assets_at_start': 0,
                'networth': 1324.0,
                'networth_start': 0,
                'other_taxes': 0,
                'passive_income': 0,
                'work_income': 1334.0,
            },
            view.get_json(req.GET),
        )


