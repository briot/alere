from .json import JSONView
from .kmm import kmm, do_query
import math
import typing


class Account:
    def __init__(
            self,
            id: typing.Union[int, str],
            parent: typing.Union[int, str, None],
            accountType: str,
            name: str,
            currencyId: str,
            currencySymbol: str,
            lastReconciled: str,
            sharesPrecision: int,
            pricePrecision: int,
            favorite=False,
        ):

        self.name = name
        self.currencyId = currencyId
        self.favorite = favorite
        self.accountType = accountType
        self.closed = False
        self.iban = None
        self.id = id
        self.parent = parent
        self.lastReconciled = lastReconciled
        self.forOpeningBalances = False
        self.sharesPrecision = sharesPrecision
        self.pricePrecision = pricePrecision
        self.currencySymbol = currencySymbol

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "favorite": self.favorite,
            "currencyId": self.currencyId,
            "currencySymbol": self.currencySymbol,
            "accountType": self.accountType,
            "closed": self.closed,
            "iban": self.iban,
            "parent": self.parent,
            "lastReconciled": self.lastReconciled,
            "forOpeningBalances": self.forOpeningBalances,
            "sharesPrecision": self.sharesPrecision,
            "pricePrecision": self.pricePrecision,
        }


class AccountList(JSONView):

    def get_json(self, params):
        query = f"""
        SELECT
           kmmAccounts.id as accountId,
           kmmAccounts.accountName as name,
           kmmAccounts.parentId as parent,
           kmmAccounts.lastReconciled,
           kmmAccounts.accountTypeString as accountType,
           kmmAccounts.currencyId,
           kmmCurrencies.symbolString,
           COALESCE
              (kmmSecurities.smallestAccountFraction,
               kmmCurrencies.smallestAccountFraction
              ) as sharesPrecision,
           COALESCE
              (kmmSecurities.pricePrecision,
               kmmCurrencies.pricePrecision
              ) as pricePrecision
        FROM kmmAccounts
           LEFT JOIN kmmSecurities
              ON (kmmAccounts.currencyId = kmmSecurities.id)
           LEFT JOIN kmmCurrencies
              ON (kmmAccounts.currencyId = kmmCurrencies.ISOcode)
        """

        accounts = {}
        for a in do_query(query):
            accounts[a.accountId] = Account(
                id=a.accountId,
                name=a.name,
                parent=a.parent,
                lastReconciled=a.lastReconciled,
                accountType=a.accountType,
                currencyId=a.currencyId,
                currencySymbol=
                   a.symbolString.strip()
                   if a.symbolString
                   else "",
                pricePrecision=int(a.pricePrecision),
                sharesPrecision=int(math.log10(float(a.sharesPrecision))),
                favorite=False)

        query = f"""
        SELECT
            kmmKeyValuePairs.kvpId as accountId,
            kmmKeyValuePairs.kvpKey as key,
            kmmKeyValuePairs.kvpData as data
        FROM kmmKeyValuePairs
            JOIN kmmAccounts where kmmKeyValuePairs.kvpId=kmmAccounts.id
        """

        for a in do_query(query):
            if a.key == "mm-closed":
                accounts[a.accountId].closed = a.data.lower() == "yes"
            elif a.key == "iban":
                accounts[a.accountId].iban = a.data
            elif a.key == "OpeningBalanceAccount":
                accounts[a.accountId].forOpeningBalances = a.data.lower() == "yes"
            elif a.key in ('reconciliationHistory', 'lastStatementBalance',
                           'lastNumberUsed', 'priceMode',

                           # for OFX import:
                           'StatementKey',
                           'lastImportedTransactionDate',
                          ):
                pass
            else:
                print('Unknown keyValue %s, for account %s, value %s' % (
                    a.key, a.accountId, a.data))

        return list(accounts.values())
