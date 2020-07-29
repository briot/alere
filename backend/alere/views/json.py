from django.http import HttpResponse
from django.views.generic import View
import json

class JSONView(View):
    def get_json(self, params, *args, **kwargs):
        return {}

    def to_json(self, obj):
        return json.dumps(obj)

    def get(self, request, *args, **kwargs):
        params = {}
        params.update(request.GET)

        resp = self.get_json(params, *args, **kwargs)
        return HttpResponse(self.to_json(resp), content_type="application/json")
