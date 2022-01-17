import datetime
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


T = TypeVar("T", bound="DateSet")


class DateSet:
    """
    Provides various ways to pass a set of dates to SQL queries
    """

    CTE = "cte_dates"
    # name of the common-table-expression created by this class

    @classmethod
    def from_range(
            cls: Type[T],
            start: Union[None, datetime.date, datetime.datetime],
            end: Union[None, datetime.date, datetime.datetime],
            max_scheduled_occurrences: Optional[int],
            scenario: Union[alere.models.Scenarios, int],
            granularity: GroupBy,
            prior: int = 0,
            after: int = 0,
            ) -> T:
        """
        A common table expression that returns all dates between
        the (start - prio) to (after + prio).
        """

        start_d = start or mindate
        end_d = min(end or maxdate, maxdate)

        if start_d == datetime.datetime.min or end_d == maxdate:
            # restrict the range based on what transactions are available
            list_splits = queries.cte_list_splits(
                dates=DateSet(
                    # ??? wrong, this might call from_range() which calls
                    # cte_list_splits
                    cte="ERROR",
                    datemin=start_d,
                    datemax=end_d,
                    prior=0,
                    after=0,
                ),
                scenario=scenario,
                max_scheduled_occurrences=max_scheduled_occurrences,
            )

            query = f"""
            WITH RECURSIVE {list_splits}
            SELECT
               min(post_date) AS mindate,
               max(post_date) AS maxdate
            FROM {queries.CTE_SPLITS}
            """

            with django.db.connection.cursor() as cur:
                cur.execute(query)
                s_mindate, s_maxdate = cur.fetchone()
                start_d = max(start_d, convert_time(s_mindate))
                end_d = min(end_d, convert_time(s_maxdate))

        start_date = start_d.strftime("%Y-%m-%d")
        end_date = end_d.strftime("%Y-%m-%d")

        if granularity == 'years':
            return cls(
                datemin=start_d,
                datemax=end_d,
                prior=prior,
                after=after,
                cte=f"""
            {cls.CTE} (date) AS (
            SELECT
                date('{end_date}', '+1 YEAR', 'start of year', '-1 day',
                   '+{after:d} YEARS')
            UNION
               SELECT date(m.date, "-1 YEAR")
               FROM {cls.CTE} m
               WHERE m.date >= date('{start_date}', '-{prior:d} YEARS')
               LIMIT {MAX_DATES}
            )"""
            )

        elif granularity == 'days':
            return cls(
                datemin=start_d,
                datemax=end_d,
                prior=prior,
                after=after,
                cte=f"""{cls.CTE} (date) AS (
            SELECT date('{end_date}', '+{after:d} DAYS')
            UNION
               SELECT date(m.date, "-1 day")
               FROM {cls.CTE} m
               WHERE m.date >= date('{start_date}', '-{prior:d} DAYS')
               LIMIT {MAX_DATES}
            )"""
            )

        else:
            return cls(
                datemin=start_d,
                datemax=end_d,
                prior=prior,
                after=after,
                cte=f"""{cls.CTE} (date) AS (
            SELECT
               --  end of first month (though no need to go past the oldest
               --  known date in the data
               date('{start_date}',
                    '-{prior:d} MONTHS',
                    'start of month',
                    '+1 month',
                    '-1 day'
                    )
            UNION
               --  end of next month, though no need to go past the last known
               --  date in the data
               SELECT date(m.date, "start of month", "+2 months", "-1 day")
               FROM {cls.CTE} m
               WHERE m.date < DATE('{end_date}', "+{after:d} MONTHS")
               LIMIT {MAX_DATES}
            )"""
            )

    @classmethod
    def from_dates(
            cls: Type[T],
            dates: Sequence[Optional[datetime.datetime]],
            ) -> Optional[T]:

        if not dates:
            return None

        d = ", ".join(
            f"({idx}, '{d.strftime('%Y-%m-%d %H:%M:%s')}')"
            for idx, d in enumerate(dates)
            if d is not None
        )
        return cls(
            datemin=min(d for d in dates if d is not None),
            datemax=max(d for d in dates if d is not None),
            prior=0,
            after=0,
            cte=f"{cls.CTE} (idx, date) AS (VALUES {d})"
        )

    def __init__(
            self,
            cte: str,
            datemin: Union[datetime.date, datetime.datetime],
            datemax: Union[datetime.date, datetime.datetime],
            prior: int,
            after: int,
            ):
        self.cte = cte
        self.min = datemin
        self.max = datemax
        self.datemin = datemin.strftime("%Y-%m-%d")
        self.datemax = datemax.strftime("%Y-%m-%d")
        self.prior = prior
        self.after = after
