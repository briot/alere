import alere
import calendar
import datetime
import dateutil.rrule
import functools
import traceback
from .means import MeanView
from .base_test import BaseTest, Split
from dateutil.relativedelta import relativedelta
from django.db.backends.signals import connection_created
from django.dispatch import receiver
from django.test import RequestFactory
from typing import Union, Dict


Transactions = alere.models.Transactions
Future = alere.models.Future_Transactions


@functools.lru_cache(maxsize=128)
def __parse_rrule(rule: str) -> dateutil.rrule.rrule:
    return dateutil.rrule.rrulestr(rule, cache=True)


def next_event(
        rule: str,
        timestamp: str,
        previous: Union[str, None],
        ) -> str:
    try:
        n = __parse_rrule(f"DTSTART:{timestamp[:10]}\nRRULE:{rule}")

        if previous is None:
            c = n.after(
                datetime.datetime.min,
                inc=True)
        else:
            c = n.after(
                datetime.datetime.strptime(previous, '%Y-%m-%d'),
                inc=False)

        if c is None:
            return None
        return c.strftime("%Y-%m-%d")

    except Exception as e:
        print(e)
        traceback.print_exc()
        return None


@receiver(connection_created)
def extend_sqlite(connection=None, **kwargs):
    """
    Called automatically when a database connection is established
    """
    if connection.vendor == 'sqlite':
        connection.connection.create_function(
            name='alr_next_event',
            narg=3,
            func=next_event,
        )


class ScheduledTests(BaseTest):

    def _assert_future(self, expected):
        f = [
            str(d[0])
            for d in
            Future.objects.values_list('nextdate')
            [:len(expected)]
        ]
        f = f + [None] * (len(expected) - len(f))   # complete
        self.assertListEqual(f, expected)

    def test_exact_day(self):
        self.create_transaction(
            timestamp="2021-12-15",
            scheduled=(
                "freq=MONTHLY;"  # once a month
                "bymonthday=3;"        # on the third
                "bymonth=1,2,3,5,6,7,8,9,10,11,12"
            ))
        self._assert_future([
            '2022-01-03', '2022-02-03', '2022-03-03', '2022-05-03'])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2021-12-15",
            scheduled=(
                "freq=DAILY;"    # at most once a day
                "bymonthday=3;"        # on the third of the month
                "bymonth=1,2,3,5,6,7,8,9,10,11,12"
            ))
        self._assert_future([
            '2022-01-03',
            '2022-02-03',
            '2022-03-03',
            '2022-05-03'])  # April was skipped as expected

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2021-12-30",
            scheduled=(
                "freq=MONTHLY;"
                "bymonthday=30;"    # invalid for February
                "bymonth=1,2,3,5,6,7,8,9,10,11,12"
            ))
        self._assert_future([
            '2021-12-30', '2022-01-30', '2022-03-30', '2022-05-30'])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2022-02-01",
            scheduled=(
                "freq=MONTHLY;"
                "bymonthday=30;"    # invalid for February
                "bymonth=1,2,3,4,5,6,9,10,11,12;"
                "count=10"
            ))
        self._assert_future([
            '2022-03-30', '2022-04-30', '2022-05-30', '2022-06-30',
            '2022-09-30', '2022-10-30', '2022-11-30', '2022-12-30',
            '2023-01-30', '2023-03-30', None, None])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2022-02-01",
            scheduled=(
                "freq=MONTHLY;"
                "bymonthday=30;"    # invalid for February
                "bymonth=1,2,3,4,5,6,9,10,11,12;"
                "until=20220901"
            ))
        self._assert_future([
            '2022-03-30', '2022-04-30', '2022-05-30', '2022-06-30',
            None, None, None, None])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2022-02-15",
            scheduled=(
                "freq=MONTHLY;"
                "bymonthday=3;"
                "until=20210128"   # earlier than start date
            ))
        self._assert_future([None])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2021-02-15",
            scheduled=(
                "freq=MONTHLY;"
                "bymonthday=3;"
                "until=20210228"   # no match in this single month
            ))
        self._assert_future([None])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2021-01-01",
            scheduled=(
                "freq=MONTHLY;"
                "bymonthday=29;"
                "bymonth=2;"
                "byday=MO"
            ))
        self._assert_future(['2044-02-29', '2072-02-29', '2112-02-29'])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2022-01-11",
            scheduled=(
                "freq=MONTHLY;"
                "bymonth=1,3,4,5,6,7,8,9,10,11,12;"
                "byday=MO"
            ))
        self._assert_future([
            '2022-01-17', '2022-01-24', '2022-01-31',
            '2022-03-07', '2022-03-14', '2022-03-21', '2022-03-28'])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2022-01-11",
            scheduled=(
                "freq=MONTHLY;"
                "bysetpos=-1;"
                "byday=MO,TU,WE,TH,FR"
            ))
        self._assert_future([
            '2022-01-31', '2022-02-28', '2022-03-31',
            '2022-04-29', '2022-05-31', '2022-06-30', '2022-07-29'])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2022-01-11",
            scheduled=(
                "freq=MONTHLY;"
                "bysetpos=-2;"
                "byday=MO,TU,WE,TH,FR"
            ))
        self._assert_future([
            '2022-01-28', '2022-02-25', '2022-03-30',
            '2022-04-28', '2022-05-30', '2022-06-29', '2022-07-28'])

        Transactions.objects.all().delete()
        self.create_transaction(
            timestamp="2022-01-11",
            scheduled=(
                "freq=MONTHLY;"
                "bysetpos=-1;"
                "byday=MO,TU,WE,TH,FR,SA,SU"
            ))
        self._assert_future([
            '2022-01-31', '2022-02-28', '2022-03-31',
            '2022-04-30', '2022-05-31', '2022-06-30', '2022-07-31'])

