from .json import JSONView
from .kmm import kmm, do_query
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
    def __init__(self, symbol: str, account: str):
        self.symbol = symbol
        self.account = account

    def to_json(self):
        return {
            "symbol": self.symbol,
            "account": self.account,
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

        tickers = [s.ticker for s in symbols] # if s.source == "Yahoo Finance"]
        data = yf.download(
            tickers,
            start="2020-08-01",
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

        return result
