import alere
import datetime
import os
from django.test import TestCase
from typing import List, Tuple
from .json import ParamDecoder


class Split:
    def __init__(self, account, qty, date, currency=None, scaled_price=100):
        """
        scaled_price is scaled by account.commodity.price_scale
        qty is scaled by account's commodity's qty_scale.
        Default currency is EUR
        """
        self.account = account
        self.qty = qty
        self.date = date
        self.currency = currency
        self.scaled_price = scaled_price


class BaseTest(TestCase, ParamDecoder):

    @classmethod
    def setUpTestData(kls):
        kls.dir = os.path.normpath(os.path.dirname(__file__))
        kls.maxDiff = None   # Want to see full exceptions backtrace

        # commodities
        kls.eur = alere.models.Commodities.objects.create(
            name='EURO', symbol_before='', symbol_after='EUR',
            iso_code='EUR', kind=alere.models.CommodityKinds.CURRENCY,
            qty_scale=100, price_scale=100)

        kls.usd = alere.models.Commodities.objects.create(
            name='USD', symbol_before='', symbol_after='USD',
            iso_code='USD', kind=alere.models.CommodityKinds.CURRENCY,
            qty_scale=1000, price_scale=1000)

        kls.stock_usd = alere.models.Commodities.objects.create(
            name='STOCK_USD', symbol_before='', symbol_after='SUD',
            iso_code='SUD', kind=alere.models.CommodityKinds.STOCK,
            qty_scale=1000, price_scale=1000)

        # accounts
        kls.checking = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.BANK),
            name='Checking Account',
            commodity=kls.eur,
            commodity_scu=100)

        kls.checking_usd = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.BANK),
            name='Checking Account in USD',
            commodity=kls.usd,
            commodity_scu=100)

        kls.salary = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.WORK_INCOME),
            name='Income',
            commodity=kls.eur,
            commodity_scu=100)

        kls.groceries = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.EXPENSE),
            name='groceries',
            commodity=kls.eur,
            commodity_scu=100)

        kls.taxes = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.EXPENSE),
            name='taxes',
            commodity=kls.eur,
            commodity_scu=100)

        kls.investment_eur = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.INVESTMENT),
            name='investment_eur',
            commodity=kls.eur,
            commodity_scu=100)

        kls.invest_stock_usd = alere.models.Accounts.objects.create(
            kind=alere.models.AccountKinds.objects.get(
                flag=alere.models.AccountFlags.STOCK),
            parent=kls.investment_eur,
            name='invest_stock_usd',
            commodity=kls.stock_usd,
            commodity_scu=1000)

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
            t.save()
            return t

    def create_prices(
            self,
            origin: alere.models.Commodities,
            target: alere.models.Commodities,
            prices: List[Tuple[str, int]],
               # (date, price scaled by origin.price_scale)
        ):
            alere.models.Prices.objects.bulk_create([
                alere.models.Prices(
                    origin=origin,
                    target=target,
                    date=self.convert_time(p[0]),
                    scaled_price=p[1],
                    source_id=alere.models.PriceSources.USER)
                for p in prices
            ])

