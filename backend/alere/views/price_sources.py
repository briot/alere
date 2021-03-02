from django.db import models
from .json import JSONView
import alere


class PriceSourceList(JSONView):
    def get_json(self, params):
        query = alere.models.PriceSources.objects.all()
        return {
            q.id: {"id": q.id, "name": q.name}
            for q in query
        }
