import datetime
from django.http import HttpResponse
from django.views.generic import View
import json


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, "to_json"):
            return obj.to_json()
        elif isinstance(obj, datetime.datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%s')

        return super().default(obj)


coder = CustomJSONEncoder()


class JSONView(View):
    def get_json(self, params, *args, **kwargs):
        return {}

    def to_json(self, obj):
        return coder.encode(obj)

    def get(self, request, *args, **kwargs):
        resp = self.get_json(request.GET, *args, **kwargs)
        return HttpResponse(self.to_json(resp), content_type="application/json")

    def as_bool(self, params, name, default=False):
        """
        Return the given parameter as a boolean
        """
        v = params.get(name)
        if v is None:
            return default
        return bool(v) and v.lower() not in ('false', '0')

    def as_time(self, params, name, default=None):
        """
        Return the given parameter as a datetime
        """
        v = params.get(name, default)
        if v is None:
            return None

        return datetime.datetime \
            .fromisoformat(v) \
            .astimezone(datetime.timezone.utc)

