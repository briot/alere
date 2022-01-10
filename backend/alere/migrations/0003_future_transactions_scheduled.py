# Generated by Django 3.1.3 on 2022-01-10 10:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('alere', '0002_initial_data_and_views'),
    ]

    operations = [
        migrations.CreateModel(
            name='Future_Transactions',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('nextdate', models.DateField()),
            ],
            options={
                'db_table': 'alr_future_transactions',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Scheduled',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('exact_day', models.SmallIntegerField(null=True)),
                ('month_pattern', models.IntegerField(null=True)),
                ('start', models.DateField()),
                ('end', models.DateField(null=True)),
            ],
            options={
                'db_table': 'alr_scheduled',
            },
        ),
    ]
