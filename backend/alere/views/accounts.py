from .json import JSONView
from .kmm import kmm, do_query
import typing


class Account:
    def __init__(self, id: typing.Union[int, str], name: str, favorite=False):
        self.id = id
        self.name = name
        self.favorite = favorite

    def to_json(self):
        return {"id": self.id, "name": self.name, "favorite": self.favorite}


class AccountList(JSONView):

    def get_json(self, params):
        return [
            Account(id=a.accountId,
                    name=a.name,
                    favorite=False)
            for a in do_query(kmm.query_accounts())
        ]