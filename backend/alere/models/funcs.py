import datetime
import dateutil.parser
import dateutil.rrule
import functools
import traceback
from django.db.backends.signals import connection_created
from django.dispatch import receiver
from typing import Union


@functools.lru_cache(maxsize=128)
def __parse_rrule(rule: str) -> dateutil.rrule.rrule:
    return dateutil.rrule.rrulestr(rule, cache=True)


def next_event(
        rule: str,
        timestamp: str,
        previous: Union[str, None],
        ) -> str:
    try:
        if rule == '':   # only occurs once, no recurring
            if previous is None:
                return timestamp
            else:
                return None

        n = __parse_rrule(f"DTSTART:{timestamp[:10]}\nRRULE:{rule}")

        c = n.after(
            dateutil.parser.parse(previous)
            if previous is not None
            else datetime.datetime.min,
            inc=False)

        if c is None:
            return None
        return c.strftime("%Y-%m-%d %H:%M:%S")

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
