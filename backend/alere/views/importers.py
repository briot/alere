from ..importers.kmymoney import import_kmymoney
from .json import JSONView
from .ofx import OFX_Exporter
import alere.models
import tempfile


class ImportKmymoney(JSONView):

    def post_json(self, params, files):
        files = files.getlist('file')
        for f in files:
            with tempfile.NamedTemporaryFile(mode="wb") as tmp:
                for chunk in f.chunks():
                    tmp.write(chunk)
                tmp.flush()
                import_kmymoney(tmp.name)
        return {"success": True}


class ExportOFX(JSONView):

    def get_json(self, params):
        e = OFX_Exporter(
            filename="export.ofx",
            currency=alere.models.Commodities.objects.get(iso_code="EUR"),
        )
        e.export()
        return {"success": True}
