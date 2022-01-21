import datetime
from dateutil.relativedelta import relativedelta
import django.db   # type: ignore
from typing import Union, Literal, TypeVar, Type, Sequence, Optional
import alere.models
import alere.views.queries as queries
from ..utils import convert_time


GroupBy = Literal['months', 'days', 'years']

MAX_DATES = 366
# A limit that controls how many dates we return. This is used to limit the
# scope of queries.

mindate = datetime.datetime(1980, 1, 1, tzinfo=datetime.timezone.utc)
maxdate = (
    datetime.datetime.now(tz=datetime.timezone.utc)
    + datetime.timedelta(days=70 * 365)
)
# Never compute past that date

CTE_DATES = "cte_dates"

one_day = relativedelta(days=+1)
one_month = relativedelta(months=+1)
one_year = relativedelta(years=+1)


class DateRange:
    __start: datetime.datetime
    __end: datetime.datetime
    start_str: str
    end_str: str

    def __init__(
            self,
            start: Union[None, datetime.date, datetime.datetime],
            end: Union[None, datetime.date, datetime.datetime],
            ):
        """
        This class describes a range of dates. It is not directly related to
        database queries.
        """
        self.set_start(start)
        self.set_end(end)

    @property
    def start(self) -> datetime.datetime:
        return self.__start

    def set_start(self, start: Union[None, datetime.date, datetime.datetime]):
        if start is None:
            start = mindate
        elif isinstance(start, datetime.date):
            start = datetime.datetime(
                start.year, start.month, start.day, 0, 0, 0,
                tzinfo=datetime.timezone.utc)

        self.__start = max(start, mindate)
        self.start_str = self.__start.strftime("%Y-%m-%d 00:00:00")

    @property
    def end(self) -> datetime.datetime:
        return self.__end

    def set_end(self, end: Union[None, datetime.date, datetime.datetime]):
        if end is None:
            end = maxdate
        elif isinstance(end, datetime.date):
            end = datetime.datetime(
                end.year, end.month, end.day, 23, 59, 59,
                tzinfo=datetime.timezone.utc)

        self.__end = min(end, maxdate)
        self.end_str = self.__end.strftime("%Y-%m-%d 23:59:59")


class Dates(DateRange):

    def __init__(
            self,
            start: Union[None, datetime.date, datetime.datetime],
            end: Union[None, datetime.date, datetime.datetime],
            granularity: GroupBy,
            ):
        """
        A common table expression that returns all dates between
        the (start - prio) to (after + prio).
        """
        super().__init__(start, end)
        self.granularity = granularity

    def extend_range(
            self,
            prior: int = 0,
            after: int = 0,
            ) -> "Dates":
        """
        Extend the range of dates by a number of `granularity`
        """
        if prior == 0 and after == 0:
            return self

        delta = (
            one_day if self.granularity == 'days'
            else one_month if self.granularity == 'months'
            else one_year
        )

        return Dates(
            start=self.start - prior * delta,
            end=self.end + after * delta,
            granularity=self.granularity,
        )

    def restrict_to_splits(
            self,
            max_scheduled_occurrences: Optional[int],
            scenario: Union[alere.models.Scenarios, int],
            ) -> None:
        """
        Restrict the range of dates to the range actually containing splits
        (or recurring occurrences of splits)
        """
        list_splits = queries.cte_list_splits(
            dates=self,
            scenario=scenario,
            max_scheduled_occurrences=max_scheduled_occurrences,
        )
        query = f"""
            WITH RECURSIVE {list_splits}
            SELECT min(post_date), max(post_date)
            FROM {queries.CTE_SPLITS}
            """
        with django.db.connection.cursor() as cur:
            cur.execute(query)
            s_mindate, s_maxdate = cur.fetchone()
            self.set_start(max(self.start, convert_time(s_mindate)))
            self.set_end(min(self.end, convert_time(s_maxdate)))

    def cte(self) -> str:
        if self.granularity == 'years':
            return f"""
            {CTE_DATES} (date) AS (
            SELECT date('{self.end_str}', '+1 YEAR', 'start of year', '-1 day')
            UNION
               SELECT date(m.date, "-1 YEAR")
               FROM {CTE_DATES} m
               WHERE m.date >= '{self.start_str}'
               LIMIT {MAX_DATES}
            )"""

        elif self.granularity == 'days':
            return f"""
            {CTE_DATES} (date) AS (
            SELECT '{self.end_str}'
            UNION
               SELECT date(m.date, "-1 day")
               FROM {CTE_DATES} m
               WHERE m.date >= '{self.start_str}'
               LIMIT {MAX_DATES}
            )"""

        else:
            return f"""
            {CTE_DATES} (date) AS (
            SELECT
               --  end of first month (though no need to go past the oldest
               --  known date in the data
               date('{self.start_str}', 'start of month', '+1 month', '-1 day')
            UNION
               --  end of next month, though no need to go past the last known
               --  date in the data
               SELECT date(m.date, "start of month", "+2 months", "-1 day")
               FROM {CTE_DATES} m
               WHERE m.date <= '{self.end_str}'
               LIMIT {MAX_DATES}
            )"""


class DateValues(DateRange):

    def __init__(
            self,
            dates: Optional[
                Sequence[Optional[Union[datetime.date, datetime.datetime]]]
            ],
            ):
        self.__dates = dates

        if dates:
            super().__init__(
                min(d for d in dates if d),
                max(d for d in dates if d),
            )
        else:
            super().__init__(mindate, maxdate)

    def cte(self) -> str:
        if not self.__dates:
            return f"""
            {CTE_DATES} (idx, date) AS (SELECT 1, NULL WHERE 0)
            """

        d = ", ".join(
            f"({idx}, '{d.strftime('%Y-%m-%d %H:%M:%s')}')"
            for idx, d in enumerate(self.__dates)
            if d is not None
        )
        return f"{CTE_DATES} (idx, date) AS (VALUES {d})"

    def __str__(self) -> str:
        return str(self.__dates)
