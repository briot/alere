from .json import JSONView
from .kmm import kmm, do_query
from .kmymoney import ACCOUNT_TYPE
from typing import List, Tuple
import math
import yfinance as yf


class Symbol:
    def __init__(
            self, id, name, ticker, source,
            stored_timestamp, stored_price
        ):
        self.id = id
        self.name = name
        self.ticker = ticker
        self.source = source
        self.stored_timestamp = stored_timestamp
        self.stored_price = stored_price

class Ticker:
    def __init__(self, symbol: Symbol, prices: List[Tuple[int, float]]):
        self.symbol = symbol
        self.prices = prices

    def to_json(self):
        return {
            "id": self.symbol.id,
            "name": self.symbol.name,
            "ticker": self.symbol.ticker,
            "source": self.symbol.source,
            "prices": [(t[0].timestamp() * 1e3, t[1]) for t in self.prices],
            "storedtime": self.symbol.stored_timestamp,
            "storedprice": self.symbol.stored_price,
        }


class AccountTicker:
    def __init__(
            self, account: str, security: str,
            absvalue: float, absshares: float,
            value: float, shares: float,
        ):
        self.security = security
        self.account = account
        self.absvalue = absvalue
        self.absshares = absshares
        self.value = value
        self.shares = shares

    def to_json(self):
        return {
            "security": self.security,
            "account": self.account,
            "absvalue": self.absvalue,
            "absshares": self.absshares,
            "value": self.value,
            "shares": self.shares,
        }



class QuotesView(JSONView):

    def get_json(self, params):

        query = f"""
        SELECT kmmSecurities.*,
           source.kvpData as source,
           isin.kvpData as isin,
           stored.priceDate as storedtime,
           stored.price as storedprice
        FROM kmmSecurities
           LEFT JOIN (
              SELECT kmmPrices.fromId,
                 kmmPrices.priceDate,
                 {kmm._to_float('kmmPrices.price')} as price
              FROM
                 kmmPrices,
                 (SELECT fromId, max(priceDate) as priceDate
                    FROM kmmPrices
                  GROUP BY fromId
                 ) latest
              WHERE kmmPrices.fromId=latest.fromId
                AND kmmPrices.priceDate=latest.priceDate
           ) stored ON (kmmSecurities.id=stored.fromId)
           LEFT JOIN kmmKeyValuePairs source
              ON (kmmSecurities.id=source.kvpId
                  AND source.kvpKey='kmm-online-source')
           lEFT JOIN kmmKeyValuePairs isin
              ON (kmmSecurities.id=isin.kvpId
                  AND isin.kvpKey='kmm-security-id')
        """

        symbols = [
            Symbol(
                row.id, row.name, row.symbol, row.source,
                stored_timestamp=row.storedtime,
                stored_price=row.storedprice,
                )
            for row in do_query(query)]

        tickers = [s.ticker for s in symbols if s.source == "Yahoo Finance"]
        data = yf.download(
            tickers,
            period="1y",
            # start="2020-01-01",
            # period="".  # 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max
            interval="1d",   # 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo
        )

        d = data['Adj Close'].to_dict()

        result = []
        for s in symbols:
            if s.ticker in d:
                rec = [(timestamp, val)
                       for timestamp, val in d[s.ticker].items()
                       if not math.isnan(val)
                      ]
                rec.sort(key=lambda v: v[0])  # order by timestamp
            else:
                rec = []

            result.append(Ticker(
                symbol=s,
                prices=rec,
            ))

        result.sort(key=lambda r: r.symbol.name)

        # We are only interested with accounts related to a security (those
        # are the stocks, but better to look at securities directly).
        #
        # For each transaction, we need to look at two splits:
        #   * the one for the above account, since it includes the shares
        #   * the sum of the ones for other accounts, since this is the value
        #     including the fees.
        #
        # For weighted average, only the transactions that impact the number
        # of shares should be counted (so do not count "Add shares" for
        # instance).

        query2 = f"""
        WITH
        accounts_with_securities AS (
           SELECT
              kmmAccounts.id as account,
              kmmSecurities.id as security
           FROM
              kmmAccounts
              JOIN kmmSecurities ON (kmmAccounts.currencyId=kmmSecurities.id)
        ),
        transaction_with_shares AS (
           SELECT
              a.account,
              a.security,
              kmmSplits.transactionId,
              {kmm._to_float('kmmSplits.shares')} as shares
           FROM
              accounts_with_securities a
              JOIN kmmSplits ON (kmmSplits.accountId=a.account)
           WHERE ({kmm._to_float('kmmSplits.shares')}) <> 0
        ),
        --  total amount, including fees. For this, we look at money that was
        --  deposited or withdrawn from other asset accounts. Must be done in
        --  a separate query: if there are multiple asset accounts, we would be
        --  counting the number of shares multiple times too.
        transaction_amount AS (
           SELECT
              t.transactionId,
              SUM({kmm._to_float('kmmSplits.value')}) as value
           FROM
              transaction_with_shares t
              JOIN kmmSplits ON (kmmSplits.transactionId=t.transactionId)
              JOIN kmmAccounts valueA ON (
                 kmmSplits.accountId=valueA.id
                 AND (kmmSplits.action = 'Reinvest'
                      OR
                      valueA.accountType IN (
                         {ACCOUNT_TYPE.ASSET},
                         {ACCOUNT_TYPE.SAVINGS},
                         {ACCOUNT_TYPE.CHECKING},
                         {ACCOUNT_TYPE.INVESTMENT}
                      )
                )
               )
            GROUP BY t.transactionId
        )
        --  Now combine everything
        SELECT
           t.account,
           t.security,
           SUM(t.shares) as shares,
           -SUM(v.value) as value,
           SUM(ABS(t.shares)) as absshares,
           SUM(ABS(v.value)) as absvalue
        FROM
           transaction_with_shares t
           LEFT JOIN transaction_amount v ON (t.transactionId = v.transactionId)
        GROUP BY t.account, t.security
        """

        accounts = [
            AccountTicker(row.account, row.security,
                          row.absvalue, row.absshares,
                          row.value, row.shares)
            for row in do_query(query2)
        ]

        return result, accounts
