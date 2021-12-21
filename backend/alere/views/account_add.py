from .json import JSONView
import alere
import logging
import json

log = logging.getLogger(__name__)


class AccountAddOrEdit(JSONView):
    def post_json(self, params, files, body):
        account = json.loads(body)
        log.error('edit account %s', account)
        a = alere.models.Accounts.objects.get(id=account['id'])
        a.name = account['name']
        a.kind = alere.models.AccountKinds.objects.get(flag=account['kindId'])
        a.parent = alere.models.Accounts.objects.get(id=account['parent'])
        a.opening_date = account['opening_date']
        a.iban = account['iban']
        a.number = account['account_num']
        a.description = account['description']
        a.institution_id = account['institution']
        a.save()
        return None
