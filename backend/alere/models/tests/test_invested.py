from alere.models import RoI, PriceSources
from alere.views.base_test import BaseTest, Split
from django.db import connection
import alere
import datetime
import os
import os.path
import unittest

class InvestedTestCase(BaseTest):

    def test_multi_currency(self):
        self.create_transaction([
            Split(
                account=self.invest_stock_usd,
                qty=20000,                # 20 shares
                date='2020-02-03',
                currency=self.usd,        # scaled_price is in USD
                scaled_price=50000),      # $50 each
            Split(
                account=self.checking,
                qty=-87000,               # paid 42.5 EUR each * 20 + taxes
                date='2020-02-03',        # assuming xrate: 1USD=0.85EUR
                currency=self.eur,
                scaled_price=100),
            Split(
                account=self.taxes,
                qty=2000,                # 20 EUR
                date='2020-02-03',
                currency=self.eur,
                scaled_price=100),
        ])

        # Adding shares for free
        self.create_transaction([
            Split(
                account=self.invest_stock_usd,
                qty=1000,                 # adding 1 share for free
                date='2020-03-01',
                currency=self.usd,
                scaled_price=None),       # price unspecified
        ])

        # Dividends (exchange of money but no change in shares)
        # ??? We never show the "21$ dividend". It is stored already converted
        # to EUR
        self.create_transaction([
            Split(
                account=self.invest_stock_usd,
                qty=0,                     # no change in number of stocks
                date='2020-04-01 00:00:00',
                currency=self.usd,
                scaled_price=None),        # price of shares unspecified
            Split(
                account=self.checking,
                qty=1890,                  # 1USD per action (21$ = 18.9 EUR)
                date='2020-04-01 00:00:00',
                currency=self.usd,
                scaled_price=111),  # xrate: 1.11 USD = 1EUR
                                # scaled by self.checking.commodity.price_scale
            Split(
                account=self.dividends,
                qty=-1890,                 # 18.9 EUR
                date='2020-04-01 00:00:00',
                currency=self.eur,
                scaled_price=100),
        ])

        # ??? Add a case where origin_id is a currency and target_id a stock
        # ??? Add a test where no known xrate EUR<->USD is known. We should not
        #   lose information, perhaps default to a 1<->1 xrate

        self.create_prices(
            origin=self.stock_usd,
            target=self.usd,
            prices=[('2020-02-05 00:00:00', 51000),  # $51
                    ('2020-02-07 00:00:00', 49000),  # $49
        ])

        self.create_prices(
            origin=self.usd,
            target=self.eur,
            prices=[('2020-02-03 00:00:00', 850),
        ])

        with connection.cursor() as cursor:
            mind = '1900-01-01 00:00:00'
            maxd = '2999-12-31 00:00:00'
            xrate_100 = 117.6470588235294
            xrate = 1.176470588235294

            # Check that prices are extracted from transactions, not just from
            # the prices table. We should also have the 1<->1 xrate for
            # currencies to themselves. This table includes xrates between
            # currencies in both directions.
            cursor.execute(
                "SELECT * FROM alr_raw_prices p"
                " ORDER BY origin_id, target_id, date"
            )
            self.assertListEqual(
                [
                    (self.eur.id, self.eur.id, 100,
                        mind, PriceSources.TRANSACTION),

                    (self.eur.id, self.usd.id, xrate_100,
                        '2020-02-03 00:00:00', PriceSources.USER),
                    (self.eur.id, self.usd.id, 111,
                        '2020-04-01 00:00:00', PriceSources.TRANSACTION),

                    (self.usd.id, self.eur.id, 850,
                        '2020-02-03 00:00:00', PriceSources.USER),
                    (self.usd.id, self.eur.id, 900.9009009009009,
                        '2020-04-01 00:00:00', PriceSources.TRANSACTION),

                    (self.usd.id, self.usd.id, 1000,
                        mind, PriceSources.TRANSACTION),
                    (self.stock_usd.id, self.usd.id, 50000,
                        '2020-02-03 00:00:00', PriceSources.TRANSACTION),
                    (self.stock_usd.id, self.usd.id, 51000,
                        '2020-02-05 00:00:00', PriceSources.USER),
                    (self.stock_usd.id, self.usd.id, 49000,
                        '2020-02-07 00:00:00', PriceSources.USER),
                ],
                list(cursor.fetchall()),
            )

            # Similar to the above, but includes all possible target currencies
            # as soon as we have xrates between them.
            cursor.execute(
                "SELECT * FROM alr_raw_prices_with_turnkey p"
                " ORDER BY origin_id, target_id, date"
            )
            self.assertListEqual(
                [
                    (self.eur.id, self.eur.id, 100.0, 100,
                        mind, PriceSources.TRANSACTION),

                    (self.eur.id, self.usd.id, xrate_100, 100,
                        '2020-02-03 00:00:00', PriceSources.USER),
                    (self.eur.id, self.usd.id, 111.0, 100,
                        '2020-04-01 00:00:00', PriceSources.TRANSACTION),

                    (self.usd.id, self.eur.id, 850.0, 1000,
                        '2020-02-03 00:00:00', PriceSources.USER),
                    (self.usd.id, self.eur.id, 900.9009009009009, 1000,
                        '2020-04-01 00:00:00', PriceSources.TRANSACTION),

                    (self.usd.id, self.usd.id, 1000.0, 1000,
                        mind, PriceSources.TRANSACTION),
                    (self.stock_usd.id, self.eur.id, 42500.0, 1000,
                        '2020-02-03 00:00:00', PriceSources.TRANSACTION),
                    (self.stock_usd.id, self.eur.id, 43350.0, 1000,
                        '2020-02-05 00:00:00', PriceSources.USER),
                    (self.stock_usd.id, self.eur.id, 41650.0, 1000,
                        '2020-02-07 00:00:00', PriceSources.USER),
                    (self.stock_usd.id, self.usd.id, 50000.0, 1000,
                        '2020-02-03 00:00:00', PriceSources.TRANSACTION),
                    (self.stock_usd.id, self.usd.id, 51000.0, 1000,
                        '2020-02-05 00:00:00', PriceSources.USER),
                    (self.stock_usd.id, self.usd.id, 49000.0, 1000,
                        '2020-02-07 00:00:00', PriceSources.USER),
                ],
                list(cursor.fetchall()),
            )

            # Check that the price history computes all ranges, and includes
            # xrates to all known currencies. Also price of stocks in all
            # currencies for which we have xrates.
            cursor.execute(
                "SELECT * FROM alr_price_history_with_turnkey p"
                " ORDER BY origin_id, target_id, mindate"
            )
            self.assertListEqual(
                [
                    (self.eur.id, self.eur.id, 100.0, 100,
                        mind, maxd, PriceSources.TRANSACTION),

                    (self.eur.id, self.usd.id, xrate_100, 100,
                        '2020-02-03 00:00:00', '2020-04-01 00:00:00',
                        PriceSources.USER),
                    (self.eur.id, self.usd.id, 111.0, 100,
                        '2020-04-01 00:00:00', maxd, PriceSources.TRANSACTION),

                    (self.usd.id, self.eur.id, 850.0, 1000,
                        '2020-02-03 00:00:00', '2020-04-01 00:00:00',
                        PriceSources.USER),
                    (self.usd.id, self.eur.id, 900.9009009009009, 1000,
                        '2020-04-01 00:00:00', maxd, PriceSources.TRANSACTION),

                    (self.usd.id, self.usd.id, 1000.0, 1000,
                        mind, maxd, PriceSources.TRANSACTION),

                    (self.stock_usd.id, self.eur.id, 42500.0, 1000,
                        '2020-02-03 00:00:00',
                        '2020-02-05 00:00:00',
                        PriceSources.TRANSACTION),
                    (self.stock_usd.id, self.eur.id, 43350.0, 1000,
                        '2020-02-05 00:00:00',
                        '2020-02-07 00:00:00',
                        PriceSources.USER),
                    (self.stock_usd.id, self.eur.id, 41650.0, 1000,
                        '2020-02-07 00:00:00',
                        maxd,
                        PriceSources.USER),

                    (self.stock_usd.id, self.usd.id, 50000.0, 1000,
                        '2020-02-03 00:00:00',
                        '2020-02-05 00:00:00',
                        PriceSources.TRANSACTION),
                    (self.stock_usd.id, self.usd.id, 51000.0, 1000,
                        '2020-02-05 00:00:00',
                        '2020-02-07 00:00:00',
                        PriceSources.USER),
                    (self.stock_usd.id, self.usd.id, 49000.0, 1000,
                        '2020-02-07 00:00:00',
                        maxd,
                        PriceSources.USER),
                ],
                list(cursor.fetchall()),
            )

            # Check that we correctly compute investments and gain at any point
            # in time
            cursor.execute(
                "SELECT * FROM alr_invested i"
                " WHERE account_id=%s"
                " ORDER BY account_id, commodity_id, currency_id, mindate",
                [self.invest_stock_usd.id],
            )
            self.assertListEqual(
                [
                    # ??? Why is the time sometimes represented as string and
                    # sometimes not ?

                    (self.invest_stock_usd.id,
                     self.stock_usd.id,
                     self.eur.id,
                     datetime.datetime(2020, 2, 3, 0, 0, 0),
                     '2020-03-01 00:00:00',
                     20.0,   # shares
                     870.0,  # invested
                     0,      # realized_gain
                     870.0,  # invested_for_shares
                     20.0,   # shares_transacted
                    ),
                    (self.invest_stock_usd.id,
                     self.stock_usd.id,
                     self.eur.id,
                     datetime.datetime(2020, 3, 1, 0, 0, 0),
                     '2020-04-01 00:00:00',
                     21.0,   # shares  (one added)
                     870.0,  # invested
                     0,      # realized_gain
                     870.0,  # invested_for_shares
                     20.0,   # shares_transacted
                    ),
                    (self.invest_stock_usd.id,
                     self.stock_usd.id,
                     self.eur.id,
                     datetime.datetime(2020, 4, 1, 0, 0, 0),
                     maxd,
                     21.0,   # shares  (one added)
                     870.0,  # invested
                     18.9,   # realized_gain (dividend)
                     870.0,  # invested_for_shares
                     20.0,   # shares_transacted
                    ),

                    # Same thing, but in USD

                    (self.invest_stock_usd.id,
                     self.stock_usd.id,
                     self.usd.id,
                     datetime.datetime(2020, 2, 3, 0, 0, 0),
                     '2020-03-01 00:00:00',
                     20.0,   # shares
                     870.0 * xrate,  # invested
                     0,      # realized_gain
                     870.0 * xrate,  # invested_for_shares
                     20.0,   # shares_transacted
                    ),
                    (self.invest_stock_usd.id,
                     self.stock_usd.id,
                     self.usd.id,
                     datetime.datetime(2020, 3, 1, 0, 0, 0),
                     '2020-04-01 00:00:00',
                     21.0,   # shares   (one added)
                     870.0 * xrate,  # invested
                     0,      # realized_gain
                     870.0 * xrate,  # invested_for_shares
                     20.0,   # shares_transacted
                    ),
                    (self.invest_stock_usd.id,
                     self.stock_usd.id,
                     self.usd.id,
                     datetime.datetime(2020, 4, 1, 0, 0, 0),
                     maxd,
                     21.0,   # shares
                     870.0 * xrate,  # invested
                     18.9 * 1.11,    # realized_gain (dividend)
                     870.0 * xrate,  # invested_for_shares
                     20.0,   # shares_transacted
                    ),
                ],
                list(cursor.fetchall()),
            )

        # We can now compute the return-on-investment at all times

        q = RoI.objects.filter(
               account=self.invest_stock_usd,
            ).order_by('currency_id', 'mindate')
        self.assertListEqual(
             [('2020-02-03 00:00:00', '2020-02-05 00:00:00',
                'STOCK_USD', 'EURO',   # that stock, prices in USD
                850.0,                 # balance: USD
                870.0,                 # invested: USD
                0,                     # gains
                20.0,                  # shares
                850 - 870.0,           # Profit and Loss
                850 / 870),            # roi
             ('2020-02-05 00:00:00', '2020-02-07 00:00:00',
                'STOCK_USD', 'EURO',   # that stock, prices in USD
                867.0,                 # balance: USD
                870.0,                 # invested: USD
                0,                     # gains
                20.0,                  # shares
                867 - 870.0,           # Profit and Loss
                867 / 870),            # roi
             ('2020-02-07 00:00:00', '2020-03-01 00:00:00',
                'STOCK_USD', 'EURO',   # that stock, prices in USD
                833.0,                 # balance: USD
                870.0,                 # invested: USD
                0,                     # gains
                20.0,                  # shares
                833 - 870.0,           # Profit and Loss
                833 / 870),            # roi
             ('2020-03-01 00:00:00', '2020-04-01 00:00:00',
                'STOCK_USD', 'EURO',   # that stock, prices in USD
                874.65,                # balance: USD
                870.0,                 # invested: USD
                0,                     # gains
                21.0,                  # shares
                874.65 - 870.0,        # Profit and Loss
                874.65 / 870.0),       # roi
             ('2020-04-01 00:00:00', '2999-12-31 00:00:00',
                'STOCK_USD', 'EURO',   # that stock, prices in USD
                874.65,                # balance: USD
                870.0,                 # invested: USD
                18.9,                  # gains
                21.0,                  # shares
                (874.65+18.9) - 870,   # Profit and Loss
                (874.65+18.9) / 870),  # roi

             # same but in USD
             ('2020-02-03 00:00:00', '2020-02-05 00:00:00',
                'STOCK_USD', 'USD',    # that stock, prices in USD
                1000.0,                # balance: USD
                870.0 * xrate,         # invested: USD
                0,                     # gains
                20.0,                  # shares
                1000 - 870 * xrate,    # Profit and Loss
                1000 / (870 * xrate)), # roi
             ('2020-02-05 00:00:00', '2020-02-07 00:00:00',
                'STOCK_USD', 'USD',    # that stock, prices in USD
                1020.0,                # balance: USD
                870.0 * xrate,         # invested: USD
                0,                     # gains
                20.0,                  # shares
                1020 - 870 * xrate,    # Profit and Loss
                1020 / (870 * xrate)), # roi
             ('2020-02-07 00:00:00', '2020-03-01 00:00:00',
                'STOCK_USD', 'USD',    # that stock, prices in USD
                980.0,                 # balance: USD
                870.0 * xrate,         # invested: USD
                0,                     # gains
                20.0,                  # shares
                980 - 870 * xrate,     # Profit and Loss
                980 / (870 * xrate)),  # roi
             ('2020-03-01 00:00:00', '2020-04-01 00:00:00',
                'STOCK_USD', 'USD',    # that stock, prices in USD
                1029.0,                # balance: USD
                870.0 * xrate,         # invested: USD
                0,                     # gains
                21.0,                  # shares
                1029 - 870 * xrate,    # Profit and Loss
                1029 / (870 * xrate)), # roi
             ('2020-04-01 00:00:00', '2999-12-31 00:00:00',
                'STOCK_USD', 'USD',    # that stock, prices in USD
                1029.0,                # balance: USD
                870.0 * xrate,         # invested: USD
                20.979,                # gains
                21.0,                  # shares
                (1029+20.979) - 870 * xrate,     # Profit and Loss
                (1029+20.979) / (870 * xrate)),  # roi
            ],
            [(r.mindate.strftime('%Y-%m-%d %H:%M:%S'),
              r.maxdate.strftime('%Y-%m-%d %H:%M:%S'),
              r.commodity.name,
              r.currency.name,
              r.balance,
              r.invested,
              r.realized_gain,
              r.shares,
              r.pl,
              r.roi)
              for r in q
            ])
