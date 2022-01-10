import alere
import calendar
import datetime
import traceback
from .means import MeanView
from .base_test import BaseTest, Split
from dateutil.relativedelta import relativedelta
from django.db.backends.signals import connection_created
from django.dispatch import receiver
from django.test import RequestFactory
from typing import Union


Scheduled = alere.models.Scheduled
Future = alere.models.Future_Transactions

# users looking for feb-29 (every four years, sometimes 8 years when landing
# on multiple of 100) on a specific day might need to look a lot of months
# forward
MAX_MONTHS_FORWARD = 12 * 7 * 7 + 1
MAX_DAYS_FORWARD = MAX_MONTHS_FORWARD * 365

one_day = datetime.timedelta(days=1)
one_month = relativedelta(months=1)


def is_month_valid(month: int, mask: int) -> bool:
    """
    Whether the given month (jan=1, feb=2, mar=3,...) is a valid choice
    for this month (as set in alere.models.Scheduled)
    """
    return (2 ** (month - 1)) & mask != 0


def is_day_valid(day: datetime.date, mask: int) -> bool:
    """
    Whether the given day (mon=1, tue=2, wed=3,...) is a valid choice
    """
    return (2 ** day.weekday()) & mask != 0


def next_event(
        last: str,                    # when did last event occur ?
        occurrence: int,              # which occurrence of the event is this
        month_day: Union[int, None],  # exact day of month
        month: int,                   # which months are valid
        week_day: int,                # which days are valid
        until: Union[str, None],      # end date for this event
        ) -> str:
    """
    Compute the date of the first event for a recurring event.
    This takes into account that the start date, as input by the user, might
    not be valid for this event.
    """
    try:
        d = datetime.datetime.strptime(last, '%Y-%m-%d').date()
        e = (
            datetime.datetime.strptime(until, "%Y-%m-%d").date()
            if until else datetime.date.max
        )

        if month_day is not None:
            # Keep increasing month until we find a valid date, and in a
            # month that the user has selected.
            year = d.year
            for inc in range(0 if occurrence == 1 else 1, MAX_MONTHS_FORWARD):
                m = (d.month + inc - 1) % 12 + 1
                if inc > 0 and m == 1:
                    year += 1
                if is_month_valid(m, month):
                    try:
                        c = datetime.date(year, m, month_day)
                    except ValueError:
                        # ??? We could also fall back on the last day of
                        # the previous month
                        #    r = calendar.monthrange(year, m)
                        #    c = datetime.date(year, m, r[1])
                        continue

                    if c > e:
                        return None
                    if c >= d and is_day_valid(c, week_day):
                        return c.strftime("%Y-%m-%d")

        else:
            # Move days forward
            if occurrence > 1:
                d += one_day

            for count in range(1, MAX_DAYS_FORWARD):
                if d > e:
                    return None

                if not is_month_valid(d.month, month):
                    # move to next month immediately
                    d = datetime.date(d.year, d.month, 1) + one_month
                    continue

                if not is_day_valid(d, week_day):
                    d += one_day
                    continue

                return d.strftime("%Y-%m-%d")

        return None

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
            narg=6,
            func=next_event,
        )


class ScheduledCase(BaseTest):

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
        #  Scheduled.objects.create(
        #      name='on_third_of_month_except_april',
        #      rrule="DTSTART:20211215; RRULE:freq=MONTHLY;bymonthday=3;"
        #          "month=JAN,FEB,MAR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC"
        #  ).save()
        #  self._assert_future([
        #      '2022-01-03', '2022-02-03', '2022-03-03', '2022-05-03'])

        Scheduled.objects.create(
            name='on_third_of_month_except_april',
            month_day=3,
            month=Scheduled.ALL_MONTHS - Scheduled.APR,
            start='2021-12-15',
        ).save()
        self._assert_future([
            '2022-01-03', '2022-02-03', '2022-03-03', '2022-05-03'])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='on_30_of_month_except_april',
            month_day=30,
            month=Scheduled.ALL_MONTHS - Scheduled.APR,
            start='2021-12-15',  # third occurrence must be skipped
        ).save()
        self._assert_future([
            '2021-12-30', '2022-01-30', '2022-03-30', '2022-05-30'])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='on_30_of_month_except_april',
            month_day=30,
            month=Scheduled.ALL_MONTHS - Scheduled.JUL - Scheduled.AUG,
            start='2022-02-01',  # first occurrence must be skipped
            count=10,
        ).save()
        self._assert_future([
            '2022-03-30', '2022-04-30', '2022-05-30', '2022-06-30',
            '2022-09-30', '2022-10-30', '2022-11-30', '2022-12-30',
            '2023-01-30', '2023-03-30', None, None])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='n_30_of_month_except_april',
            month_day=30,
            month=Scheduled.ALL_MONTHS - Scheduled.JUL - Scheduled.AUG,
            start='2022-02-01',  # first occurrence must be skipped
            until='2022-09-01',
        ).save()
        self._assert_future([
            '2022-03-30', '2022-04-30', '2022-05-30', '2022-06-30',
            None, None, None, None])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='end is before start',
            month_day=3,
            start='2021-02-15',
            until='2021-01-28',
        ).save()
        self._assert_future([None])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='no valid repeat',
            month_day=3,
            start='2021-02-15',
            until='2021-02-28',
        ).save()
        self._assert_future([None])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='29-Feb on Mondays',
            month_day=29,
            month=Scheduled.FEB,
            week_day=Scheduled.MON,
            start='2021-01-01',
        ).save()
        self._assert_future(['2044-02-29', '2072-02-29', '2112-02-29'])

        Scheduled.objects.all().delete()
        Scheduled.objects.create(
            name='every other Monday',
            month=Scheduled.ALL_MONTHS - Scheduled.FEB,
            week_day=Scheduled.MON,
            start='2022-01-11',
        ).save()
        self._assert_future([
            '2022-01-17', '2022-01-24', '2022-01-31',
            '2022-03-07', '2022-03-14', '2022-03-21', '2022-03-28'])
