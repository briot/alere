import datetime
from django.http import HttpResponse
from django.views.generic import View
import json
import math


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, "to_json"):
            return obj.to_json()
        elif isinstance(obj, datetime.datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, datetime.date):
            return obj.strftime('%Y-%m-%d')

        return super().default(obj)


coder = CustomJSONEncoder(allow_nan=True)


class ParamDecoder:

    def convert_time(self, value: str = None):
        """
        Return the given parameter as a datetime
        """
        if value is None:
            return None

        return datetime.datetime \
            .fromisoformat(value) \
            .astimezone(datetime.timezone.utc)

    def convert_to_int_list(self, value: str = None):
        if value is None:
            return value
        return [int(d) for d in value.split(',')]


class JSONView(View, ParamDecoder):
    def get_json(self, params, *args, **kwargs):
        return {}

    def post_json(self, params, files, *args, **kwargs):
        return {}

    def to_json(self, obj):
        return coder.encode(obj)

    def get(self, request, *args, **kwargs):
        resp = self.get_json(request.GET, *args, **kwargs)
        return HttpResponse(self.to_json(resp), content_type="application/json")

    def post(self, request, *args, **kwargs):
        resp = self.post_json(request.POST, request.FILES, *args, **kwargs)
        return HttpResponse(self.to_json(resp), content_type="application/json")

    def as_commodity_id(self, params, name):
        return int(params[name])

    def as_bool(self, params, name, default=False):
        """
        Return the given parameter as a boolean
        """
        v = params.get(name)
        if v is None:
            return default
        return bool(v) and v.lower() not in ('false', '0', 'undefined')

    def as_time(self, params, name, default=None):
        return self.convert_time(params.get(name, default))

    def as_time_list(self, params, name, default=None):
        """
        Return the given parameter as a list of datetime
        """
        v = params.get(name, default)
        if v is None:
            return v
        return [
            datetime.datetime.fromisoformat(d).astimezone(datetime.timezone.utc)
            for d in v.split(',')
        ]

    def as_int_list(self, params, name, default=None):
        return self.convert_to_int_list(params.get(name, default))


