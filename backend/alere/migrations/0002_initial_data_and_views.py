# Generated by Django 3.0.7 on 2020-10-05 19:50

from django.db import migrations
import django.db
from alere import models
import sys


invested_flags = ",".join("'%s'" % f for f in models.AccountFlags.invested())


def create_views(apps, schema_editor):
    models.PriceSources.objects.create(
        id=models.PriceSources.USER,
        name="User",
    )
    models.PriceSources.objects.create(
        id=models.PriceSources.YAHOO,
        name="Yahoo Finance",
    )
    models.PriceSources.objects.create(
        id=models.PriceSources.TRANSACTION,
        name="Transaction",
    )

    for f in models.AccountFlags:
        if f == models.AccountFlags.PASSIVE_INCOME:
            models.AccountKinds.objects.create(
                name="Passive income",
                flag=models.AccountFlags.PASSIVE_INCOME,
                name_when_positive='Income',
                name_when_negative='Expense',
            )
        elif f == models.AccountFlags.WORK_INCOME:
            models.AccountKinds.objects.create(
                name="Work income",
                flag=models.AccountFlags.WORK_INCOME,
                name_when_positive='Income',
                name_when_negative='Expense',
            )
        elif f == models.AccountFlags.MISC_INCOME:
            models.AccountKinds.objects.create(
                name="Misc income",
                flag=models.AccountFlags.MISC_INCOME,
                name_when_positive='Income',
                name_when_negative='Expense',
            )
        elif f == models.AccountFlags.UNREALIZED_GAINS:
            models.AccountKinds.objects.create(
                name="Unrealized gains",
                flag=models.AccountFlags.UNREALIZED_GAINS,
                name_when_positive='Increase',
                name_when_negative='Decrease',
            )
        elif f == models.AccountFlags.EXPENSE:
            models.AccountKinds.objects.create(
                name="Expenses",
                flag=models.AccountFlags.EXPENSE,
                name_when_positive='Income',
                name_when_negative='Expense',
            )
        elif f == models.AccountFlags.INCOME_TAX:
            models.AccountKinds.objects.create(
                name="Income tax",
                flag=models.AccountFlags.INCOME_TAX,
                name_when_positive='Increase',
                name_when_negative='Decrease',
            )
        elif f == models.AccountFlags.MISC_TAX:
            models.AccountKinds.objects.create(
                name="Other taxes",
                flag=models.AccountFlags.MISC_TAX,
                name_when_positive='Increase',
                name_when_negative='Decrease',
            )
        elif f == models.AccountFlags.LIABILITY:
            models.AccountKinds.objects.create(
                name="Liability",
                flag=models.AccountFlags.LIABILITY,
                name_when_positive='Increase',
                name_when_negative='Decrease',
            )
        elif f == models.AccountFlags.STOCK:
            models.AccountKinds.objects.create(
                name="Stocks",
                flag=models.AccountFlags.STOCK,
                name_when_positive='Add',
                name_when_negative='Remove',
            )
        elif f == models.AccountFlags.ASSET:
            models.AccountKinds.objects.create(
                name="Assets",
                flag=models.AccountFlags.ASSET,
                name_when_positive='Increase',
                name_when_negative='Decrease',
            )
        elif f == models.AccountFlags.BANK:
            models.AccountKinds.objects.create(
                name="Bank accounts",
                flag=models.AccountFlags.BANK,
                name_when_positive='Deposit',
                name_when_negative='Paiement',
            )
        elif f == models.AccountFlags.EQUITY:
            models.AccountKinds.objects.create(
                name="Equity",
                flag=models.AccountFlags.EQUITY,
                name_when_positive='Increase',
                name_when_negative='Decrease',
            )
        elif f == models.AccountFlags.INVESTMENT:
            models.AccountKinds.objects.create(
                name="Investment",
                flag=models.AccountFlags.INVESTMENT,
                name_when_positive='Deposit',
                name_when_negative='Paiement',
            )
        else:
            print('\n\nNo AccountKind for flag %s\n\n' % f)
            sys.exit(1)



class Migration(migrations.Migration):

    dependencies = [
        ('alere', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_views),
        migrations.RunSQL(
        f"""

        --  Lookup prices in various places.
        --  This combines price information from the historical prices in
        --  alr_prices (applying conversions in both directions), and from
        --  the prices used in actual transactions.
        --  This table only has currencies as targets, so can contain the
        --  price of stocks or exchange rates between currencies.
        --  Only prices explicitly found in the database exist.
        --
        --  scaled_price are scaled by origin's price_scale as in alr_prices

        DROP VIEW IF EXISTS alr_raw_prices;
        CREATE VIEW alr_raw_prices AS
           SELECT origin_id, target_id, scaled_price, date, source_id
              FROM alr_prices p2
                 JOIN alr_commodities t ON (p2.target_id=t.id)
              WHERE t.kind = '{models.CommodityKinds.CURRENCY}'

           UNION ALL

           --  consider exchange rates in both directions
           SELECT target_id, origin_id,
               CAST(target.price_scale AS FLOAT)
                  * origin.price_scale
                  / alr_prices.scaled_price,
               date,
               source_id
              FROM alr_prices
                 JOIN alr_commodities origin
                    ON (alr_prices.origin_id=origin.id)
                 JOIN alr_commodities target
                    ON (alr_prices.target_id=target.id)
              WHERE origin.kind='{models.CommodityKinds.CURRENCY}'

           UNION ALL

           --  extract prices from transactions
           SELECT a.commodity_id AS origin_id,
              s.currency_id AS target_id,
              s.scaled_price,
              s.post_date AS date,
              {models.PriceSources.TRANSACTION} as source_id
              FROM alr_splits s
                 JOIN alr_commodities t ON (s.currency_id=t.id)
                 JOIN alr_accounts a ON (s.account_id=a.id)
              WHERE t.kind='{models.CommodityKinds.CURRENCY}'
                 AND a.commodity_id <> s.currency_id
                 AND s.scaled_price is NOT NULL

           UNION ALL

           --  A currency always has a 1.0 exchange rate with itself. This
           --  simplifies the computation of balances later on
           SELECT c.id AS origin_id,
              c.id AS target_id,
              c.price_scale AS scaled_price,
              '1900-01-01 00:00:00' as date,
              {models.PriceSources.TRANSACTION} as source_id
              FROM alr_commodities c
              WHERE c.kind='{models.CommodityKinds.CURRENCY}'
        ;

        --  Similar to alr_raw_prices but also include prices after going
        --  through a turnkey currency (ie commodity -> currency1 -> currency2)
        --  by taking advantage of the exchange rates in the database. Because
        --  there is always a 1.0 xrate from a currency to itself, all the
        --  direct commodity->currency1 rates are also available.
        --  All prices scaled by origin.price_scale
        DROP VIEW IF EXISTS alr_raw_prices_with_turnkey;
        CREATE VIEW alr_raw_prices_with_turnkey AS
           SELECT a.origin_id,
               p.target_id,
               CAST(a.scaled_price AS FLOAT) * p.scaled_price
               / c.price_scale AS scaled_price,  --  in p.target_id
               o.price_scale,
               a.date,
               a.source_id
           FROM alr_raw_prices a
                JOIN alr_commodities o ON (a.origin_id=o.id)
                JOIN alr_price_history p ON (a.target_id=p.origin_id)
                JOIN alr_commodities c ON (p.origin_id=c.id)
           WHERE
             p.mindate<=a.date
             AND a.date<p.maxdate

             --  A currency always has an xrate 1<->1 with itself
             AND (a.origin_id != p.target_id
                  OR a.origin_id = a.target_id)
        ;

        --  Provide price of commodities for any point in time.
        DROP VIEW IF EXISTS alr_price_history;
        CREATE VIEW alr_price_history AS
           SELECT p.origin_id,   --  Currency or Stock
             p.target_id,        --  Always a currency
             p.scaled_price,     --  scaled by origin_id's price_scale
             p.date as mindate,
             COALESCE(
                LEAD(p.date)
                   OVER (PARTITION BY p.origin_id, p.target_id
                         ORDER BY p.date),
                '2999-12-31 00:00:00'
             ) as maxdate,
             p.source_id
           FROM alr_raw_prices p
        ;

        DROP VIEW IF EXISTS alr_price_history_with_turnkey;
        CREATE VIEW alr_price_history_with_turnkey AS
           SELECT p.origin_id,
             p.target_id,
             p.scaled_price,
             p.price_scale,
             p.date as mindate,
             COALESCE(
                LEAD(p.date)
                   OVER (PARTITION BY p.origin_id, p.target_id
                         ORDER BY p.date),
                '2999-12-31 00:00:00'
             ) as maxdate,
             p.source_id
           FROM alr_raw_prices_with_turnkey p
        ;

        DROP VIEW IF EXISTS alr_balances;
        CREATE VIEW alr_balances AS
           SELECT
              row_number() OVER () as id,   --  for django's sake
              alr_accounts.id AS account_id,
              alr_accounts.commodity_id,
              alr_splits.post_date as mindate,
              COALESCE(
                 LEAD(alr_splits.post_date)
                    OVER (PARTITION BY alr_accounts.id
                          ORDER by post_date),
                 '2999-12-31 00:00:00'
                ) AS maxdate,
              CAST( sum(alr_splits.scaled_qty)
                 OVER (PARTITION BY alr_accounts.id
                       ORDER BY post_date
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 AS FLOAT
                ) / alr_accounts.commodity_scu
                AS balance
           FROM alr_splits
              JOIN alr_accounts
                 ON (alr_splits.account_id = alr_accounts.id)
        ;

        DROP VIEW IF EXISTS alr_balances_currency;
        CREATE VIEW alr_balances_currency AS
            SELECT
               alr_balances.id,
               alr_balances.account_id,
               alr_commodities.id as commodity_id,
               max(alr_balances.mindate, alr_price_history.mindate) as mindate,
               min(alr_balances.maxdate, alr_price_history.maxdate) as maxdate,
               CAST(alr_balances.balance * alr_price_history.scaled_price
                    AS FLOAT)
                  / source.price_scale as balance,
               alr_balances.balance as shares,
               CAST(alr_price_history.scaled_price AS FLOAT)
                  / source.price_scale
                  as computed_price
            FROM
               alr_balances,
               alr_price_history,
               alr_commodities,
               alr_commodities source
            WHERE
               --  price from: the account's commodity
               source.id = alr_balances.commodity_id
               AND alr_balances.commodity_id=alr_price_history.origin_id

               --  price target: the user's requested commoditty
               AND alr_price_history.target_id=alr_commodities.id

               --  intervals intersect
               AND alr_balances.mindate < alr_price_history.maxdate
               AND alr_price_history.mindate < alr_balances.maxdate

               --  target commodities can only be currencies
               AND alr_commodities.kind='C'
        ;

        DROP VIEW IF EXISTS alr_splits_with_value;
        CREATE VIEW alr_splits_with_value AS
            SELECT
               row_number() OVER () as id,   --  for django's sake
               alr_splits.*,
               alr_splits.currency_id AS value_currency_id,
               alr_accounts.commodity_id,
               CAST(alr_splits.scaled_price * alr_splits.scaled_qty AS FLOAT)
                  / alr_commodities.price_scale
                  / alr_accounts.commodity_scu
                  AS value,
               CAST(alr_splits.scaled_price AS FLOAT)
                  / alr_commodities.price_scale AS computed_price
            FROM
               alr_splits
               JOIN alr_accounts ON (alr_splits.account_id=alr_accounts.id)
               JOIN alr_commodities
                  ON (alr_accounts.commodity_id=alr_commodities.id)
        ;

        DROP VIEW IF EXISTS alr_latest_price;
        CREATE VIEW alr_latest_price AS
            SELECT
               alr_prices.*
            FROM alr_prices,
               (SELECT origin_id, MAX(date) as date
                  FROM alr_prices GROUP BY origin_id) latest
            WHERE alr_prices.origin_id=latest.origin_id
              AND alr_prices.date=latest.date
        ;

        --  For all accounts, compute the total amount invested (i.e. money
        --  transfered from other user accounts) and realized gains (i.e.
        --  money transferred to other user accounts).
        --
        --  For efficiency (to avoid traversing tables multiple times), this
        --  duplicates the alr_balances and alr_balances_currency views.
        --
        --  To handle multi-currency, the computation is duplicated in all
        --  possible currencies known in the database, applying the exchange
        --  rate at the time of the transaction.
        --
        --  All values given in currency_id and unscaled

        DROP VIEW IF EXISTS alr_invested;
        CREATE VIEW alr_invested AS
           SELECT
              a.id AS account_id,
              a.commodity_id,
              xrate.target_id as currency_id, --  currency for investment,..
              s.post_date AS mindate,
              COALESCE(
                 LEAD(s.post_date)
                    OVER (PARTITION BY s.account_id, xrate.target_id
                          ORDER by s.post_date),
                 '2999-12-31 00:00:00'
                ) AS maxdate,
              CAST(SUM(CASE WHEN s.account_id = s2.account_id
                            THEN s.scaled_qty ELSE 0 END)
                 OVER (PARTITION BY s.account_id, xrate.target_id
                       ORDER BY s.post_date
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 AS FLOAT
                ) / a.commodity_scu
                AS shares,
              SUM(CASE WHEN s.account_id <> s2.account_id AND s2.scaled_qty < 0
                       THEN CAST(-s2.scaled_qty        --  number of shares
                                 * s2.scaled_price     --  price per share
                                 * xrate.scaled_price  --  convert to currency
                                 AS FLOAT)
                            / (s2a.commodity_scu   --  scale scaled_qty
                              * xrate.price_scale  --  scale xrate.scaled_price
                              * c2.price_scale)    --  scale s2.scaled_price
                       ELSE 0 END)
                 OVER (PARTITION BY s.account_id, xrate.target_id
                       ORDER BY s.post_date
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 AS invested,
              SUM(CASE WHEN s.account_id <> s2.account_id AND s2.scaled_qty > 0
                       THEN CAST(s2.scaled_qty        --  number of shares
                                 * s2.scaled_price     --  price per share
                                 * xrate.scaled_price  --  convert to currency
                                 AS FLOAT)
                            / (s2a.commodity_scu   --  scale scaled_qty
                              * xrate.price_scale  --  scale xrate.scaled_price
                              * c2.price_scale)    --  scale s2.scaled_price
                       ELSE 0 END)
                 OVER (PARTITION BY s.account_id, xrate.target_id
                       ORDER BY s.post_date
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 AS realized_gain,
              SUM(CASE WHEN s.account_id <> s2.account_id
                         AND s2.scaled_qty <> 0
                         AND s.scaled_qty <> 0
                       THEN CAST(abs(s2.scaled_qty)    --  number of shares
                                 * s2.scaled_price     --  price per share
                                 * xrate.scaled_price  --  convert to currency
                                 AS FLOAT)
                            / (s2a.commodity_scu   --  scale scaled_qty
                              * xrate.price_scale  --  scale xrate.scaled_price
                              * c2.price_scale)    --  scale s2.scaled_price
                       ELSE 0 END)
                 OVER (PARTITION BY s.account_id, xrate.target_id
                       ORDER BY s.post_date
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 AS invested_for_shares,
              CAST(SUM(CASE WHEN s.account_id <> s2.account_id
                         AND s2.scaled_qty <> 0 AND s.scaled_qty <> 0
                       THEN abs(s.scaled_qty) ELSE 0 END)
                    OVER (PARTITION BY s.account_id, xrate.target_id
                          ORDER BY s.post_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                   AS FLOAT)
                 / a.commodity_scu
                 AS shares_transacted
           FROM alr_splits s
              JOIN alr_splits s2 USING (transaction_id)
              JOIN alr_accounts a ON (s.account_id = a.id)

              --  All the splits that transfer money between two accounts (they
              --  do not modify overall networth).
              JOIN alr_accounts s2a
                 ON (s2.account_id=s2a.id
                     AND s2a.kind_id IN ({invested_flags}))
              JOIN alr_commodities c2 ON (s2a.commodity_id = c2.id)

              --  To handle multi-currencies, we convert the prices to a
              --  common currency
              JOIN alr_price_history_with_turnkey xrate
                 ON (s2.currency_id=xrate.origin_id
                     AND s2.post_date >= xrate.mindate
                     AND s2.post_date < xrate.maxdate)
        ;

        --  For all accounts, compute the return on investment at any point
        --  in time, by combining the balance at that time with the total
        --  amount invested that far and realized gains moved out of the
        --  account.

        DROP VIEW IF EXISTS alr_roi;
        CREATE VIEW alr_roi AS
           SELECT
              row_number() OVER () as id,   --  for django's sake
              max(b.mindate, p.mindate) as mindate,
              min(b.maxdate, p.maxdate) as maxdate,
              b.commodity_id,    --  which stock are talking about ?
              b.account_id,      --  traded in which account ?
              b.realized_gain,   --  in b.currency_id
              b.invested,        --  in b.currency_id
              b.shares,          --  in b.commodity_id
              b.currency_id,     --  all values are given in this currency
              CAST(b.shares * p.scaled_price AS FLOAT) / p.price_scale
                 AS balance,
              CAST(p.scaled_price AS FLOAT) / p.price_scale
                 AS computed_price,
              (CAST(b.shares * p.scaled_price AS FLOAT) / p.price_scale
                 + b.realized_gain) / b.invested as roi,
              CAST(b.shares * p.scaled_price AS FLOAT) / p.price_scale
                 + b.realized_gain - b.invested as pl,
              (b.invested - b.realized_gain) / b.shares as average_cost,
              (b.invested_for_shares / b.shares_transacted) as weighted_average
           FROM
              alr_invested b

              --  price of shares given in the same currency as
              --  investment, gains, ...
              JOIN alr_price_history_with_turnkey p
                 ON (b.commodity_id = p.origin_id
                     AND b.currency_id = p.target_id)
           WHERE
              --  intervals intersect
              b.mindate < p.maxdate
              AND p.mindate < b.maxdate
        """
        )
    ]
