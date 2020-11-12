import alere
import datetime
from django.test import TestCase
from typing import List, Tuple
from .json import ParamDecoder


class Split:
    def __init__(self, account, qty, date, currency=None, scaled_price=100):
        """
        scaled_price is scaled by currency's price_scale.
        qty is scaled by account's commodity's qty_scale.
        Default currency is EUR
        """
        self.account = account
        self.qty = qty
        self.date = date
        self.currency = currency
        self.scaled_price = scaled_price


class BaseTest(TestCase, ParamDecoder):

    def setUp(self):
        super().setUp()

        # currencies
        self.eur = alere.models.Commodities.objects.create(
            name='EURO', symbol_before='', symbol_after='EUR',
            iso_code='EUR', kind=alere.models.CommodityKinds.CURRENCY,
            qty_scale=100, price_scale=100)

        self.usd = alere.models.Commodities.objects.create(
            name='USD', symbol_before='', symbol_after='USD',
            iso_code='USD', kind=alere.models.CommodityKinds.CURRENCY,
            qty_scale=1000, price_scale=1000)

        # accounts
        self.checking = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.BANK),
            name='Checking Account',
            commodity=self.eur,
            commodity_scu=100)

        self.checking_usd = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.BANK),
            name='Checking Account in USA',
            commodity=self.usd,
            commodity_scu=100)

        self.salary = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.WORK_INCOME),
            name='Income',
            commodity=self.eur,
            commodity_scu=100)

        self.groceries = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.EXPENSE),
            name='groceries',
            commodity=self.eur,
            commodity_scu=100)


    def create_transaction(
            self,
            splits=List[Split],
        ):
            t = alere.models.Transactions.objects.create(
                timestamp=self.convert_time(splits[0].date),
            )
            for s in splits:
                t.splits.create(
                    account=s.account,
                    currency=self.eur if s.currency is None else s.currency,
                    scaled_price=s.scaled_price,
                    scaled_qty=s.qty,
                    post_date=self.convert_time(s.date),
                )
            return t
