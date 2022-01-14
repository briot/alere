from ..importers.kmymoney import import_kmymoney
from .json import JSONView
import alere
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
