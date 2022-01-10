import alere
import datetime
from .means import MeanView
from .base_test import BaseTest, Split
from django.db.backends.signals import connection_created
from django.dispatch import receiver
from django.test import RequestFactory
from typing import Union


Scheduled = alere.models.Scheduled
Future = alere.models.Future_Transactions


def is_month_valid(month: Union[str, int], mask: int) -> bool:
    """
    Whether the given month (jan=1, feb=2, mar=3,...) is a valid choice
    for this month_pattern (as set in alere.models.Scheduled)
    """
    return (2 ** (int(month) - 1)) & mask != 0


@receiver(connection_created)
def extend_sqlite(connection=None, **kwargs):
    """
    Called automatically when a database connection is established
    """
    if connection.vendor == 'sqlite':
        connection.connection.create_function(
            name='alr_valid_month',
            narg=2,
            func=is_month_valid,
        )


class ScheduledCase(BaseTest):

    def _assert_future(self, expected):
        f = [
            str(d[0])
            for d in
            Future.objects.values_list('nextdate')
            [:len(expected)]
        ]
        self.assertListEqual(f, expected)

    def test_exact_day(self):
        Scheduled.objects.create(
            name='1 on_third_of_month_except_april',
            exact_day=3,
            month_pattern=Scheduled.ALL_MONTHS - Scheduled.APR,
            start='2021-12-15',
        ).save()
        self._assert_future([
            '2022-01-03', '2022-02-03', '2022-03-03', '2022-05-03'])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='2 on_30_of_month_except_april',
            exact_day=30,
            month_pattern=Scheduled.ALL_MONTHS - Scheduled.APR,
            start='2021-12-15',  # third occurrence must be skipped
        ).save()
        self._assert_future([
            '2021-12-30', '2022-01-30', '2022-03-30', '2022-05-30'])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='3 on_30_of_month_except_april',
            exact_day=30,
            month_pattern=Scheduled.ALL_MONTHS - Scheduled.JUL - Scheduled.AUG,
            start='2022-02-01',  # first occurrence must be skipped
        ).save()
        self._assert_future([
            '2022-03-30', '2022-04-30', '2022-05-30', '2022-06-30'])
