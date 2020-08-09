import datetime
import math
from .json import JSONView
from typing import List, Union
from .kmm import kmm, do_query
from .kmymoney import ACCOUNT_TYPE, ARMAGEDDON


class NetworthLine:
    def __init__(
            self,
            accountId: Union[str,int],
            shares: List[float],
            price: List[Union[float, None]],
        ):
        self.accountId = accountId
        self.shares = shares
        self.price = price

    def to_json(self):
        return {
            "accountId": self.accountId,
            "shares": self.shares,
            "price": self.price,
        }


class NetworthView(JSONView):

    def get_json(self, params):
        dates = params.get("dates")[0].split(',') or []
        currency = params.get("currency")[0]

        shares = {}
        prices = {}

        for d in dates:
            query, params = (f"""
               WITH
                  {kmm._price_history(currency)},
                  shares AS (
                      SELECT
                         s.accountId,
                         kmmAccounts.currencyId,
                         SUM({kmm._to_float('s.shares')}) as balanceShares
                      FROM kmmSplits s
                         JOIN kmmAccounts ON (kmmAccounts.id = s.accountId)
                      WHERE s.postDate <= :maxdate
                         AND kmmAccounts.accountType != {ACCOUNT_TYPE.INCOME}
                         AND kmmAccounts.accountType != {ACCOUNT_TYPE.EXPENSE}
                         AND kmmAccounts.accountType != {ACCOUNT_TYPE.EQUITY}
                      GROUP BY s.accountId, kmmAccounts.currencyId
                 )

               SELECT
                  shares.accountId,
                  shares.balanceShares,
                  COALESCE(
                     price_history.computedPrice,
                     CASE WHEN shares.currencyId = :currency THEN 1
                          ELSE NULL
                     END
                  ) as computedPrice
               FROM shares
                  LEFT JOIN price_history
                     ON (price_history.priceDate <= :maxdate
                         AND :maxdate < price_history.maxDate
                         AND price_history.fromId = shares.currencyId
                         AND price_history.toId = :currency
                        )
               """,
               {
                   "maxdate": d,
                   "currency": currency,
               }
            )

            for row in do_query(query, params):
                shares.setdefault(row.accountId, []).append(row.balanceShares)
                prices.setdefault(row.accountId, []).append(row.computedPrice)

        result = []
        for a in shares.keys():
            result.append(
                NetworthLine(
                    accountId=a,
                    shares=shares[a],
                    price=prices[a],
                )
            )

        return result
