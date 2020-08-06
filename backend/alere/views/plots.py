from .json import JSONView
from typing import List, Union
from .kmm import kmm, do_query
from .kmymoney import ACCOUNT_TYPE


class PlotData:
    def __init__(self, name, value):
        self.name = name
        self.value = value

    def __repr__(self):
        return f"""<Data {self.name} {self.value}"""

    def to_json(self):
        return {
            "name": self.name,
            "value": self.value,
        }


class CategoryPlotView(JSONView):

    def get_json(self, params, expenses: str):
        is_expenses = expenses == "expenses"

        accounts = None
        currency = "EUR"
        maxdate = None
        mindate = "2020-01-01"

        q = kmm._query_detailed_splits(
            accounts=accounts, currency=currency, maxdate=maxdate)

        query, params = (f"""
            SELECT
               destAccount.accountName as category,
               SUM({kmm._to_float('destS.value')}) as value
            FROM
               kmmSplits destS
               JOIN kmmAccounts destAccount
                  ON (destS.accountId = destAccount.id)
            WHERE destS.postDate >= :mindate
              AND destAccount.accountType = :categoryType
            GROUP BY category
            """,
            {
                "mindate": mindate,
                "categoryType":
                    ACCOUNT_TYPE.EXPENSE
                    if is_expenses
                    else ACCOUNT_TYPE.INCOME,
                # "maxdate": maxdate,
            }
        )
        result = [
            PlotData(
                name=row.category,
                value=round(
                    row.value if is_expenses else -row.value,
                    2))
            for row in do_query(query, params)
        ]
        result.sort(key=lambda d: -d.value)
        return result
