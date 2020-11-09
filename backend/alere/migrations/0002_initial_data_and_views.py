# Generated by Django 3.0.7 on 2020-10-05 19:50

from django.db import migrations
import django.db
from alere import models
import sys


networth_flags = ",".join("'%s'" % f for f in models.AccountFlags.networth())


def create_views(apps, schema_editor):
    models.PriceSources.objects.create(
        name="User",
    )
    models.PriceSources.objects.create(
        name="Yahoo Finance",
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
        DROP VIEW IF EXISTS alr_price_history;
        CREATE VIEW alr_price_history AS
           SELECT alr_prices.origin_id,
             alr_prices.target_id,
             alr_prices.scaled_price, --  scaled by origin_id's price_scale
             alr_prices.date as mindate,
             COALESCE(
                max(alr_prices.date)
                   OVER (PARTITION BY alr_prices.origin_id, alr_prices.target_id
                         ORDER BY alr_prices.date
                         ROWS BETWEEN 1 FOLLOWING AND 1 FOLLOWING),
                '2999-12-31 00:00:00'
             ) as maxdate,
             alr_prices.source_id
           FROM alr_prices

           UNION ALL

           --  A currency always has a 1.0 exchange rate with itself. This
           --  simplifies the computation of balances later on
           SELECT alr_commodities.id as origin_id,
              alr_commodities.id as target_id,
              alr_commodities.price_scale as scaled_price,
              '1900-01-01 00:00:00' as mindate,
              '2999-12-31 00:00:00' as maxdate,
              'User' as source_id
            FROM alr_commodities
            WHERE alr_commodities.kind='C'
        ;

        DROP VIEW IF EXISTS alr_balances;
        CREATE VIEW alr_balances AS
           SELECT
              row_number() OVER () as id,   --  for django's sake
              alr_accounts.id AS account_id,
              alr_accounts.commodity_id,
              alr_splits.post_date as mindate,
              COALESCE(
                 max(alr_splits.post_date)
                    OVER (PARTITION BY alr_accounts.id
                          ORDER by post_date
                          ROWS BETWEEN 1 FOLLOWING AND 1 FOLLOWING),
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
               --  price from: the account's comodity
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

        DROP VIEW IF EXISTS alr_accounts_list;
        CREATE VIEW alr_accounts_list AS
            SELECT
               alr_accounts.id as id,
               alr_accounts.name as name,
               alr_accounts.parent_id,
               '2000-01-01 00:00:00' as last_reconciled,
               alr_accounts.kind_id,
               alr_accounts.commodity_id,
               alr_accounts.commodity_scu,
               alr_institutions.id as institution_id,
               alr_accounts.closed,
               alr_accounts.iban
            FROM
               alr_accounts
               LEFT JOIN alr_institutions
                  ON (alr_accounts.institution_id=alr_institutions.id)
        ;

        DROP VIEW IF EXISTS alr_splits_with_value;
        CREATE VIEW alr_splits_with_value AS
            SELECT
               row_number() OVER () as id,   --  for django's sake
               alr_splits.*,
               alr_splits.currency_id AS value_currency_id,
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
                  ON (alr_splits.currency_id=alr_commodities.id)
        ;

        DROP VIEW IF EXISTS alr_latest_price;
        CREATE VIEW alr_latest_price AS
            SELECT
               alr_prices.*
            FROM alr_prices,
               (SELECT origin_id, MAX(date) as date
                  FROM alr_prices GROUP BY origin_Id) latest
            WHERE alr_prices.origin_id=latest.origin_id
              AND alr_prices.date=latest.date
        ;

        --  Return all accounts that trade securities, along with the number of
        --  shares (currently own and traded over time) and total amount spent,
        --  so that we can compute average prices for instance.
        DROP VIEW IF EXISTS alr_accounts_security;
        CREATE VIEW alr_accounts_security AS
           --  external query is only for the sake of django
           SELECT
              row_number() OVER () as id,   --  for django's sake
              tmp.*
           FROM (
              SELECT
                 splits_for_account.transaction_id,
                 splits_for_account.account_id,
                 currency.commodity_id as currency_id,
                 currency.commodity_scu as scale,
                 SUM(all_splits.scaled_qty) as scaled_qty
              FROM
                 alr_splits splits_for_account
                 JOIN alr_transactions t
                    ON (splits_for_account.transaction_id=t.id)
                 JOIN alr_splits all_splits
                    ON (all_splits.transaction_id=t.id)
                 JOIN alr_accounts currency
                    ON (currency.id=all_splits.account_id)
              WHERE
                 --  Only money to or from user accounts, since otherwise the
                 --  sum is 0
                 currency.kind_id IN ({networth_flags})
              GROUP BY currency.commodity_id, scale,
                 splits_for_account.transaction_id,
                 splits_for_account.account_id
           ) tmp
           ORDER BY transaction_id
           ;
        """
        )
    ]
