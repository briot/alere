from .json import JSONView
from typing import List, Union
from .kmm import kmm, do_query
from .kmymoney import ACCOUNT_TYPE


class PlotDataItem:
    def __init__(self, accountId, value):
        self.accountId = accountId
        self.value = value

    def __repr__(self):
        return f"""<Data {self.accountId} {self.value}"""

    def to_json(self):
        return {
            "accountId": self.accountId,
            "value": self.value,
        }

class PlotData:
    def __init__(
            self,
            mindate: str,
            maxdate: str,
            items: List[PlotDataItem]
        ):
        self.items = items
        self.mindate = mindate
        self.maxdate = maxdate

    def to_json(self):
        return {
            "items": self.items,
            "mindate": self.mindate,
            "maxdate": self.maxdate,
        }


class CategoryPlotView(JSONView):

    def get_json(self, params, expenses: str):
        is_expenses = expenses == "expenses"

        accounts = None
        currency = "EUR"
        maxdate = params.get('maxdate')[0]
        mindate = params.get('mindate')[0]

        q = kmm._query_detailed_splits(
            accounts=accounts, currency=currency, maxdate=maxdate)

        query, params = (f"""
            SELECT
               destAccount.id as category,
               SUM({kmm._to_float('destS.value')}) as value
            FROM
               kmmSplits destS
               JOIN kmmAccounts destAccount
                  ON (destS.accountId = destAccount.id)
            WHERE destS.postDate >= :mindate
              AND destS.postDate <= :maxdate
              AND destAccount.accountType = :categoryType
            GROUP BY category
            """,
            {
                "mindate": mindate,
                "maxdate": maxdate,
                "categoryType":
                    ACCOUNT_TYPE.EXPENSE
                    if is_expenses
                    else ACCOUNT_TYPE.INCOME,
                # "maxdate": maxdate,
            }
        )
        result = PlotData(
            mindate=mindate,
            maxdate=maxdate or "",
            items=[
                PlotDataItem(
                    accountId=row.category,
                    value=round(
                        row.value if is_expenses else -row.value,
                        2))
                for row in do_query(query, params)
            ]
        )
        result.items.sort(key=lambda d: -d.value)  # order in the legend
        return result
