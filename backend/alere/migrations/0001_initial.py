# Generated by Django 3.1.3 on 2021-05-29 06:57

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Balances',
            fields=[
                ('id', models.BigIntegerField(primary_key=True, serialize=False)),
                ('mindate', models.DateTimeField()),
                ('maxdate', models.DateTimeField()),
                ('balance', models.FloatField()),
            ],
            options={
                'db_table': 'alr_balances',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Balances_Currency',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('balance', models.FloatField()),
                ('shares', models.FloatField()),
                ('computed_price', models.FloatField()),
                ('mindate', models.DateTimeField()),
                ('maxdate', models.DateTimeField()),
            ],
            options={
                'db_table': 'alr_balances_currency',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Latest_Price',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateTimeField()),
                ('scaled_price', models.IntegerField()),
            ],
            options={
                'db_table': 'alr_latest_price',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='RoI',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mindate', models.DateTimeField()),
                ('maxdate', models.DateTimeField()),
                ('balance', models.FloatField()),
                ('computed_price', models.FloatField()),
                ('realized_gain', models.FloatField()),
                ('invested', models.FloatField()),
                ('shares', models.FloatField()),
                ('roi', models.FloatField()),
                ('pl', models.FloatField()),
                ('average_cost', models.FloatField()),
                ('weighted_average', models.FloatField()),
            ],
            options={
                'db_table': 'alr_roi',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Splits_With_Value',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scaled_qty', models.IntegerField()),
                ('reconcile', models.CharField(choices=[('n', 'New transaction'), ('C', 'Cleared'), ('R', 'Reconciled')], default='n', max_length=1)),
                ('reconcile_date', models.DateTimeField(null=True)),
                ('post_date', models.DateTimeField()),
                ('value', models.FloatField()),
                ('computed_price', models.FloatField()),
            ],
            options={
                'db_table': 'alr_splits_with_value',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='AccountKinds',
            fields=[
                ('flag', models.TextField(choices=[('IP', 'Passive Income'), ('IW', 'Work Income'), ('IM', 'Misc Income'), ('IU', 'Unrealized Gains'), ('EX', 'Expense'), ('TI', 'Income Tax'), ('TM', 'Misc Tax'), ('L', 'Liability'), ('S', 'Stock'), ('A', 'Asset'), ('B', 'Bank'), ('I', 'Investment'), ('NL', 'Non Liquid Investment'), ('EQ', 'Equity')], max_length=2, primary_key=True, serialize=False)),
                ('name', models.TextField()),
                ('name_when_positive', models.TextField()),
                ('name_when_negative', models.TextField()),
            ],
            options={
                'db_table': 'alr_account_kinds',
            },
        ),
        migrations.CreateModel(
            name='Accounts',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('description', models.TextField(null=True)),
                ('iban', models.TextField(null=True)),
                ('number', models.TextField(null=True)),
                ('closed', models.BooleanField(default=False)),
                ('commodity_scu', models.IntegerField()),
                ('last_reconciled', models.DateTimeField(null=True)),
                ('opening_date', models.DateField(null=True)),
            ],
            options={
                'db_table': 'alr_accounts',
            },
        ),
        migrations.CreateModel(
            name='Commodities',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('symbol_before', models.TextField()),
                ('symbol_after', models.TextField()),
                ('iso_code', models.TextField(null=True)),
                ('kind', models.CharField(choices=[('C', 'Currency'), ('S', 'Stock'), ('M', 'Mutual Fund'), ('B', 'Bond')], max_length=1)),
                ('price_scale', models.IntegerField(default=100)),
                ('quote_symbol', models.TextField(null=True)),
            ],
            options={
                'db_table': 'alr_commodities',
            },
        ),
        migrations.CreateModel(
            name='Institutions',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('manager', models.TextField(null=True)),
                ('address', models.TextField(null=True)),
                ('phone', models.TextField(null=True)),
                ('routing_code', models.TextField(null=True)),
                ('icon', models.TextField(null=True)),
            ],
            options={
                'db_table': 'alr_institutions',
            },
        ),
        migrations.CreateModel(
            name='Payees',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PriceSources',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
            ],
            options={
                'db_table': 'alr_price_sources',
            },
        ),
        migrations.CreateModel(
            name='Transactions',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField()),
                ('memo', models.TextField(null=True)),
                ('check_number', models.TextField(null=True)),
            ],
            options={
                'db_table': 'alr_transactions',
            },
        ),
        migrations.CreateModel(
            name='Splits',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scaled_qty', models.IntegerField()),
                ('scaled_value', models.IntegerField()),
                ('reconcile', models.CharField(choices=[('n', 'New transaction'), ('C', 'Cleared'), ('R', 'Reconciled')], default='n', max_length=1)),
                ('reconcile_date', models.DateTimeField(null=True)),
                ('post_date', models.DateTimeField()),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='splits', to='alere.accounts')),
                ('payee', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='splits', to='alere.payees')),
                ('transaction', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='splits', to='alere.transactions')),
                ('value_commodity', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='alere.commodities')),
            ],
            options={
                'db_table': 'alr_splits',
            },
        ),
        migrations.CreateModel(
            name='Prices',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateTimeField()),
                ('scaled_price', models.IntegerField()),
                ('origin', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prices', to='alere.commodities')),
                ('source', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='alere.pricesources')),
                ('target', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='alere.commodities')),
            ],
            options={
                'db_table': 'alr_prices',
            },
        ),
        migrations.AddField(
            model_name='commodities',
            name='quote_source',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='alere.pricesources'),
        ),
        migrations.AddField(
            model_name='accounts',
            name='commodity',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='accounts', to='alere.commodities'),
        ),
        migrations.AddField(
            model_name='accounts',
            name='institution',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='alere.institutions'),
        ),
        migrations.AddField(
            model_name='accounts',
            name='kind',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='alere.accountkinds'),
        ),
        migrations.AddField(
            model_name='accounts',
            name='parent',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='subaccounts', to='alere.accounts'),
        ),
    ]
