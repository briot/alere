import datetime
from django.http import QueryDict, HttpResponse, HttpRequest   # type: ignore
from django.views.generic import View  # type: ignore
import json
import math
from typing import Optional, List, Any, Union, Dict
from .utils import convert_time

JSON = Union[str, int, Dict, List]


def nan_enc(p: float):
    """
    Convert a float to a value suitable for JSON, including support for NaN
    """
    return (None if p is None or math.isnan(p) else p)


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> JSON:
        if hasattr(obj, "to_json"):
            return obj.to_json()
        elif isinstance(obj, datetime.datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, datetime.date):
            return obj.strftime('%Y-%m-%d')

        return super().default(obj)


coder = CustomJSONEncoder(allow_nan=True)


class ParamDecoder:

    def convert_to_int_list(self, value: str = None) -> Optional[List[int]]:
        if value is None:
            return None
        return [int(d) for d in value.split(',')]


class JSONView(View, ParamDecoder):
    def get_json(
            self,
            params: QueryDict,
            **kwargs: str) -> Any:
        return {}

    def post_json(
            self,
            params: QueryDict,
            files,
            body,
            *args,
            **kwargs) -> Any:
        return {}

    def to_json(self, obj: Any) -> JSON:
        return coder.encode(obj)

    def get(self, request: HttpRequest, *args, **kwargs) -> HttpResponse:
        resp = self.get_json(request.GET, *args, **kwargs)
        return HttpResponse(
            self.to_json(resp), content_type="application/json")

    def post(self, request: HttpRequest, *args, **kwargs) -> HttpResponse:
        resp = self.post_json(
            request.POST, request.FILES, request.body, *args, **kwargs)
        return HttpResponse(
            self.to_json(resp), content_type="application/json")

    def as_commodity_id(self, params: QueryDict, name: str) -> int:
        return int(params[name])

    def as_bool(self, params: QueryDict, name: str, default=False) -> bool:
        """
        Return the given parameter as a boolean
        """
        v = params.get(name)
        if v is None:
            return default
        return bool(v) and v.lower() not in ('false', '0', 'undefined')

    def as_time(
            self,
            params: QueryDict,
            name: str,
            default: str = None,
            ) -> Optional[datetime.datetime]:
        return convert_time(params.get(name, default))

    def as_time_list(
            self,
            params: QueryDict,
            name: str,
            default: str = None,
            ) -> Optional[List[datetime.datetime]]:
        """
        Return the given parameter as a list of datetime
        """
        v = params.get(name, default)
        if v is None:
            return v
        return [
            datetime.datetime.fromisoformat(d).astimezone(
                datetime.timezone.utc)
            for d in v.split(',')
        ]

    def as_int_list(
            self,
            params: QueryDict,
            name: str,
            default: str = None,
            ) -> Optional[List[int]]:
        return self.convert_to_int_list(params.get(name, default))
