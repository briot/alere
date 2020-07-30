from .json import JSONView


class Account:
    def __init__(self, id, name, favorite=False):
        self.id = id
        self.name = name
        self.favorite = favorite

    def to_json(self):
        return {"id": self.id, "name": self.name, "favorite": self.favorite}


class AccountList(JSONView):

    def get_json(self, params):
        return [
            Account(0, 'assets:societe generale:commun'),
            Account(1, 'assets:boursorama:commun'),
            Account(2, 'assets:banque postale:courant'),

            Account(3, 'expenses:car'),
            Account(6, 'expenses:taxes'),
            Account(4, 'income:salary'),
            Account(5, 'income:presents'),
        ]
