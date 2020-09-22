from .json import JSONView
from .kmm import kmm, do_query
from .kmymoney import ACCOUNT_TYPE
from typing import List, Tuple
import datetime
import math
import yfinance as yf


class Symbol:
    def __init__(
            self, id, name, ticker, source, currency,
            stored_timestamp, stored_price
        ):
        self.id = id
        self.name = name
        self.ticker = ticker
        self.source = source
        self.currency = currency
        self.stored_timestamp = stored_timestamp
        self.stored_price = stored_price   # last stored price
        self.prices = []   # history of prices

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "ticker": self.ticker,
            "source": self.source,
            "prices": self.prices,
            "currency": self.currency,
            "storedtime": self.stored_timestamp,
            "storedprice": self.stored_price,
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

    def from_database(self, symbols, currency):
        """
        Fetch prices from database, for symbols that do not have prices yet.
        """
        ids = [s.id for s in symbols.values() if not s.prices]
        if ids:
            ids_str = ','.join(f"'{id}'" for id in ids)
            query_prices = f"""
            SELECT fromId, priceDate, {kmm._to_float('price')} as price
              FROM kmmPrices
              WHERE toId=:currency
                AND fromId IN ({ids_str})
              ORDER BY priceDate
            """

            for row in do_query(query_prices, {"currency": currency}):
                symbols[row.fromId].prices.append(
                    (datetime.datetime.fromisoformat(row.priceDate).timestamp()
                        * 1e3,
                    row.price)
                )

            for id in ids:
                symbols[id].source = 'database'

    def from_yahoo(self, symbols):
        """
        Fetch prices from Yahoo
        """
        tickers = [s.ticker for s in symbols.values()
                   if s.source == "Yahoo Finance"]
        if tickers:
            data = yf.download(
                tickers,
                # start="2020-01-01",
                period="1y",   # 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max
                interval="1d", # 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,
                               # 1wk,1mo,3mo
            )
            d = data['Adj Close'].to_dict()
            for s in symbols.values():
                if s.ticker in d:
                    s.prices = [
                        (timestamp.timestamp() * 1e3, val)
                        for timestamp, val in d[s.ticker].items()
                        if not math.isnan(val)
                    ]
                    s.prices.sort(key=lambda v: v[0]) # order by timestamp

    def roi_from_balance(self, symbols, currency):
        """
        For accounts that do not use prices (mutual funds,...) we simply compute
        performance by computing the balance from the account.
        """
        ids = [s.id for s in symbols.values() if not s.prices]
        if not ids:
            return;

        ids_str = ','.join(f"'{id}'" for id in ids)

        q = f"""
        WITH RECURSIVE
        first_split_dates AS (
            SELECT MIN(kmmSplits.postDate) as mindate,
               kmmSplits.accountId as accountId,
               kmmAccounts.currencyId as currencyId
            FROM kmmSplits, kmmAccounts
            WHERE kmmAccounts.currencyId IN ({ids_str})
              AND kmmSplits.accountId=kmmAccounts.id
            GROUP BY kmmSplits.accountId
        ),
        all_dates AS (
            SELECT first_split_dates.accountId,
               first_split_dates.currencyId,
               first_split_dates.mindate as date
               FROM first_split_dates
            UNION ALL
            SELECT all_dates.accountId,
                  all_dates.currencyId,
                  DATE(all_dates.date, "+1 MONTHS")
               FROM all_dates
               WHERE all_dates.date < CURRENT_DATE
        ),
        {kmm._price_history(currency)}

        SELECT
           all_dates.accountId,
           all_dates.currencyId,
           all_dates.date,
           coalesce(price_history.computedPrice, 1) as computedPrice,
           SUM({kmm._to_float('s.shares')}) as balanceShares,
           SUM(CASE
              WHEN s.action IN ('Buy', 'Sell') THEN
                 {kmm._to_float('s.value')}   --  doesn't include fees
              ELSE 0
              END) as invested
        FROM
           kmmSplits s,
           all_dates
           LEFT JOIN price_history
              ON (price_history.fromId = all_dates.currencyId
                  AND all_dates.date >= price_history.priceDate
                  AND all_dates.date < price_history.maxDate)
        WHERE all_dates.accountId=s.accountId
           AND s.postDate <= all_dates.date
        GROUP BY all_dates.accountId, all_dates.date, computedPrice

        ORDER BY all_dates.accountId, all_dates.date
        """

        for row in do_query(q):
            symbols[row.currencyId].prices.append(
                (datetime.datetime.fromisoformat(row.date).timestamp() * 1e3,
                row.computedPrice * row.balanceShares - row.invested)
            )


    def get_json(self, params):
        update = self.as_bool(params, 'update', False)
        currency = params.get("currency", "EUR")

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

        symbols = {
            row.id: Symbol(
                row.id, row.name, row.symbol, row.source,
                row.tradingCurrency,
                stored_timestamp=row.storedtime,
                stored_price=row.storedprice,
            )
            for row in do_query(query)
        }

        if update:
            self.from_yahoo(symbols)
        # self.roi_from_balance(symbols, currency=currency)
        self.from_database(symbols, currency=currency)

        # Sort symbols
        result = sorted(symbols.values(), key=lambda r: r.name)

        # We are only interested in accounts related to a security (those
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
