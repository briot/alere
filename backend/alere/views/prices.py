from .json import JSONView
from .kmm import kmm, do_query

class Price:
    def __init__(self, date: str, price: float):
        self.date = date
        self.price = price

    def to_json(self):
        return {
            "date": self.date,
            "price": self.price,
        }


class PriceHistory(JSONView):

    def get_json(self, params, accountId):
        query = f"""
        SELECT
           kmmPrices.priceDate,
           {kmm._to_float('kmmPrices.price')} as price
        FROM kmmPrices, kmmAccounts
        WHERE kmmAccounts.currencyId = kmmPrices.fromId
          AND kmmPrices.toId = :currency
          AND kmmAccounts.id = :account
        ORDER BY kmmPrices.priceDate"""

        params = {
            "account": accountId,
            "currency": params.get("currency")[0] or "EUR",
        }

        return [
            Price(date=row.priceDate, price=row.price)
            for row in do_query(query, params)
        ]

