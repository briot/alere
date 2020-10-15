# Generated by Django 3.0.7 on 2020-10-16 08:28

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AccountLists',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('last_reconciled', models.DateTimeField()),
                ('price_scale', models.IntegerField()),
                ('institution', models.TextField()),
                ('closed', models.BooleanField()),
                ('iban', models.TextField()),
            ],
            options={
                'db_table': 'alr_accounts_list',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Accounts_Security',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scale', models.IntegerField()),
                ('scaled_qty', models.IntegerField()),
            ],
            options={
                'db_table': 'alr_accounts_security',
                'managed': False,
            },
        ),
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
            name='By_Month',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('value', models.FloatField()),
            ],
            options={
                'db_table': 'alr_by_month',
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
            name='Price_History',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scaled_price', models.IntegerField()),
                ('mindate', models.DateTimeField()),
                ('maxdate', models.DateTimeField()),
            ],
            options={
                'db_table': 'alr_price_history',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Splits_With_Value',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scaled_price', models.IntegerField()),
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
                ('flag', models.TextField(choices=[('IP', 'Passive Income'), ('IW', 'Work Income'), ('IM', 'Misc Income'), ('IU', 'Unrealized Gains'), ('EX', 'Expense'), ('TI', 'Income Tax'), ('TM', 'Misc Tax'), ('L', 'Liability'), ('S', 'Stock'), ('A', 'Asset'), ('B', 'Bank'), ('EQ', 'Equity')], max_length=2, primary_key=True, serialize=False)),
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
                ('is_work_income', models.BooleanField(default=False)),
                ('is_passive_income', models.BooleanField(default=False)),
                ('is_misc_income', models.BooleanField(default=False)),
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
                ('symbol', models.TextField()),
                ('iso_code', models.TextField(null=True)),
                ('prefixed', models.BooleanField(default=False)),
                ('kind', models.CharField(choices=[('C', 'Currency'), ('S', 'Stock'), ('M', 'Mutual Fund'), ('B', 'Bond')], max_length=1)),
                ('qty_scale', models.IntegerField(default=100)),
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
            ],
            options={
                'db_table': 'alr_institutions',
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
                ('memo', models.TextField()),
                ('payee', models.TextField(null=True)),
                ('check_number', models.TextField()),
            ],
            options={
                'db_table': 'alr_transactions',
            },
        ),
        migrations.CreateModel(
            name='Splits',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scaled_price', models.IntegerField()),
                ('scaled_qty', models.IntegerField()),
                ('reconcile', models.CharField(choices=[('n', 'New transaction'), ('C', 'Cleared'), ('R', 'Reconciled')], default='n', max_length=1)),
                ('reconcile_date', models.DateTimeField(null=True)),
                ('post_date', models.DateTimeField()),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='splits', to='alere.Accounts')),
                ('currency', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='alere.Commodities')),
                ('transaction', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='splits', to='alere.Transactions')),
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
                ('origin', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prices', to='alere.Commodities')),
                ('source', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='alere.PriceSources')),
                ('target', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='alere.Commodities')),
            ],
            options={
                'db_table': 'alr_prices',
            },
        ),
        migrations.AddField(
            model_name='commodities',
            name='quote_source',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='alere.PriceSources'),
        ),
        migrations.AddField(
            model_name='accounts',
            name='commodity',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='accounts', to='alere.Commodities'),
        ),
        migrations.AddField(
            model_name='accounts',
            name='institution',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='alere.Institutions'),
        ),
        migrations.AddField(
            model_name='accounts',
            name='kind',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='alere.AccountKinds'),
        ),
        migrations.AddField(
            model_name='accounts',
            name='parent',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='subaccounts', to='alere.Accounts'),
        ),
    ]
