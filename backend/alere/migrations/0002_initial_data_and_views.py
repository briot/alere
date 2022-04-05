# Generated by Django 3.0.7 on 2020-10-05 19:50

from django.db import migrations     # type: ignore
from alere import models


armageddon = "'2999-12-31 00:00:00'"


def create_views(apps, schema_editor):
    models.Scenarios.objects.create(
        id=models.Scenarios.NO_SCENARIO,
        name='Actual transactions',
    )

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

    models.AccountKinds.objects.create(
        name="Passive income",
        name_when_positive='Expense',
        name_when_negative='Income',
        category=models.AccountKindCategory.INCOME,
        is_passive_income=True,
    )

    models.AccountKinds.objects.create(
        name="Work income",
        name_when_positive='Expense',
        name_when_negative='Income',
        category=models.AccountKindCategory.INCOME,
        is_work_income=True,
    )

    models.AccountKinds.objects.create(
        name="Misc income",
        name_when_positive='Expense',
        name_when_negative='Income',
        category=models.AccountKindCategory.INCOME,
        is_work_income=False,
    )

    models.AccountKinds.objects.create(
        name="Unrealized gain",
        name_when_positive='Decrease',
        name_when_negative='Increase',
        category=models.AccountKindCategory.INCOME,
        is_unrealized=True,
    )

    models.AccountKinds.objects.create(
        name="Expense",
        name_when_positive='Expense',
        name_when_negative='Income',
        category=models.AccountKindCategory.EXPENSE,
    )

    models.AccountKinds.objects.create(
        name="Income tax",
        name_when_positive='Increase',
        name_when_negative='Decrease',
        category=models.AccountKindCategory.EXPENSE,
        is_income_tax=True,
    )

    models.AccountKinds.objects.create(
        name="Other tax",
        name_when_positive='Increase',
        name_when_negative='Decrease',
        category=models.AccountKindCategory.EXPENSE,
        is_misc_tax=True,
    )

    models.AccountKinds.objects.create(
        name="Liability",
        name_when_positive='Deposit',
        name_when_negative='Paiement',
        category=models.AccountKindCategory.LIABILITY,
        is_networth=True,
    )

    models.AccountKinds.objects.create(
        name="Stock",
        name_when_positive='Add',
        name_when_negative='Remove',
        category=models.AccountKindCategory.EQUITY,
        is_trading=True,
        is_stock=True,
        is_networth=True,
    )

    models.AccountKinds.objects.create(
        name="Bank account",
        name_when_positive='Deposit',
        name_when_negative='Paiement',
        category=models.AccountKindCategory.EQUITY,
        is_networth=True,
    )

    models.AccountKinds.objects.create(
        name="Equity",
        name_when_positive='Increase',
        name_when_negative='Decrease',
        category=models.AccountKindCategory.EQUITY,
        is_networth=False,
    )

    models.AccountKinds.objects.create(
        name="Investment",
        name_when_positive='Deposit',
        name_when_negative='Paiement',
        category=models.AccountKindCategory.EQUITY,
        is_networth=True,
        is_trading=True,
    )

    models.AccountKinds.objects.create(
        name="Asset",
        name_when_positive='Increase',
        name_when_negative='Decrease',
        category=models.AccountKindCategory.ASSET,
        is_networth=True,
    )

    models.AccountKinds.objects.create(
        name="Non-liquid Investment",
        name_when_positive='Deposit',
        name_when_negative='Paiement',
        category=models.AccountKindCategory.ASSET,
        is_networth=True,
        is_trading=True,
    )


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

           --  extract prices from transactions.
           SELECT a.commodity_id AS origin_id,
              s.value_commodity_id AS target_id,
              CAST(s.scaled_value
                   * a.commodity_scu    --  scale for s.scaled_qty
                   * curr.price_scale   --  to get a scaled value
                   AS FLOAT)
                 / (s.scaled_qty
                    * t.price_scale     --  scale for s.scaled_value
                ),
              s.post_date AS date,
              {models.PriceSources.TRANSACTION} as source_id
              FROM alr_splits s
                 JOIN alr_commodities t ON (s.value_commodity_id=t.id)
                 JOIN alr_accounts a ON (s.account_id=a.id)
                 JOIN alr_commodities curr ON (a.commodity_id=curr.id)
              WHERE t.kind='{models.CommodityKinds.CURRENCY}'
                 AND a.commodity_id <> s.value_commodity_id

           UNION ALL

           --  extract prices from transactions  (reverse direction)
           SELECT s.value_commodity_id AS origin_id,
              a.commodity_id AS target_id,
              CAST(s.scaled_qty
                   * t.price_scale   --  scale for s.scaled_value
                   * t.price_scale   --  to get a scaled value
                   AS FLOAT)
                  / (s.scaled_value
                     * a.commodity_scu    --  scale for s.scaled_qty
                    ),
              s.post_date AS date,
              {models.PriceSources.TRANSACTION} as source_id
              FROM alr_splits s
                 JOIN alr_commodities t ON (s.value_commodity_id=t.id)
                 JOIN alr_accounts a ON (s.account_id=a.id)
                 JOIN alr_commodities curr ON (a.commodity_id=curr.id)
              WHERE curr.kind='{models.CommodityKinds.CURRENCY}'
                 AND a.commodity_id <> s.value_commodity_id

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
                {armageddon}
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
                {armageddon}
             ) as maxdate,
             p.source_id
           FROM alr_raw_prices_with_turnkey p
        ;

        --------------------
        --  For all accounts, compute the total amount invested (i.e. money
        --  transferred from other user accounts) and realized gains (i.e.
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
        --------------------

        DROP VIEW IF EXISTS alr_invested;
        CREATE VIEW alr_invested AS
           WITH internal_splits AS (
              SELECT s2.transaction_id,
                 s2.account_id,
                 xrate.target_id,
                 CAST(s2.scaled_value       --  number of shares
                      * xrate.scaled_price  --  convert to currency
                        AS FLOAT)
                    / (c2.price_scale       --  scale of scaled_value
                      * xrate.price_scale)  --  scale of xrate.scaled_price
                AS value
              FROM
                 alr_splits s2

                 --  All the splits that transfer money between two accounts
                 --  (they do not modify overall networth).
                 JOIN alr_accounts s2a ON (s2.account_id=s2a.id)
                 JOIN alr_account_kinds s2ak
                     ON (s2a.kind_id=s2ak.id AND s2ak.is_networth)
                 JOIN alr_commodities c2 ON (s2.value_commodity_id = c2.id)

                 --  To handle multi-currencies, we convert the prices to a
                 --  common currency
                 JOIN alr_price_history_with_turnkey xrate
                    ON (s2.value_commodity_id=xrate.origin_id
                        AND s2.post_date >= xrate.mindate
                        AND s2.post_date < xrate.maxdate)
           ),
           include_empty_range AS (
              SELECT
                 a.id AS account_id,
                 a.commodity_id,
                 s2.target_id as currency_id, --  currency for investment,..
                 s.post_date AS mindate,
                 COALESCE(
                    LEAD(s.post_date) OVER win,
                    {armageddon}
                 ) AS maxdate,
                 CAST(SUM(CASE WHEN s.account_id = s2.account_id
                               THEN s.scaled_qty ELSE 0 END)
                    OVER win
                    AS FLOAT
                   ) / a.commodity_scu
                   AS shares,
                 SUM(CASE WHEN s.account_id <> s2.account_id AND s2.value < 0
                          THEN -s2.value
                          ELSE 0 END)
                    OVER win
                    AS invested,
                 SUM(CASE WHEN s.account_id <> s2.account_id AND s2.value > 0
                          THEN s2.value
                          ELSE 0 END)
                    OVER win
                    AS realized_gain,
                 SUM(CASE WHEN s.account_id <> s2.account_id
                            AND s2.value <> 0
                            AND s.scaled_qty <> 0
                          THEN abs(s2.value)
                          ELSE 0 END)
                    OVER win
                    AS invested_for_shares,
                 CAST(SUM(CASE WHEN s.account_id <> s2.account_id
                            AND s2.value <> 0 AND s.scaled_qty <> 0
                          THEN abs(s.scaled_qty) ELSE 0 END)
                       OVER win
                      AS FLOAT)
                    / a.commodity_scu
                    AS shares_transacted
               FROM alr_splits s
                 JOIN internal_splits s2 USING (transaction_id)
                 JOIN alr_accounts a ON (s.account_id = a.id)
               WINDOW win AS (
                   PARTITION BY s.account_id, s2.target_id
                   ORDER BY s.post_date
                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
               )
           )
           SELECT *
             FROM include_empty_range
            WHERE mindate <> maxdate
        ;

        --------------------
        --  For all accounts, compute the return on investment at any point
        --  in time, by combining the balance at that time with the total
        --  amount invested that far and realized gains moved out of the
        --  account.
        --------------------

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
        ;
        """
        )
    ]
