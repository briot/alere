import alere
import datetime
from .plots import CategoryPlotView
from .base_test import BaseTest, Split
from django.test import RequestFactory


class PlotTestCase(BaseTest):

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

    def test_income(self):
        req = RequestFactory().get(
            '/api/incomeexpense',
            {
                "mindate": '2020-01-01',
                "maxdate": '2020-12-01',
                "currency": self.eur.id,
                "expense": False,
                "income": True,
            })
        view = CategoryPlotView()
        self.assertDictEqual(
            {
                'items': [
                    {'accountId': self.salary.id,
                     'value': 1334.0,
                    }
                ],
                'maxdate': datetime.datetime(
                    2020, 12, 1, 0, 0, tzinfo=datetime.timezone.utc),
                'mindate': datetime.datetime(
                    2020, 1, 1, 0, 0, tzinfo=datetime.timezone.utc),
            },
            view.get_json(req.GET),
        )

    def test_expenses(self):
        req = RequestFactory().get(
            '/api/incomeexpense',
            {
                "mindate": '2020-01-01',
                "maxdate": '2020-12-01',
                "currency": self.eur.id,
                "expense": True,
                "income": False,
            })
        view = CategoryPlotView()
        self.assertDictEqual(
            {
                'items': [
                    {
                        'accountId': self.groceries.id,
                        'value': -10.0,   # groceries
                    }
                ],
                'maxdate': datetime.datetime(
                    2020, 12, 1, 0, 0, tzinfo=datetime.timezone.utc),
                'mindate': datetime.datetime(
                    2020, 1, 1, 0, 0, tzinfo=datetime.timezone.utc),
            },
            view.get_json(req.GET),
        )

