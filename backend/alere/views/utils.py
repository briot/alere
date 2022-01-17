import datetime
from typing import List, Optional, overload


@overload
def convert_time(value: None) -> None:
    pass


@overload
def convert_time(value: str) -> datetime.datetime:
    pass


def convert_time(value: str = None) -> Optional[datetime.datetime]:
    """
    Return the given string as a datetime
    """
    if value is None:
        return None
    return datetime.datetime \
        .fromisoformat(value) \
        .astimezone(datetime.timezone.utc)
