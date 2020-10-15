from .json import JSONView
import alere
import datetime
import math
import yfinance as yf


class QuotesView(JSONView):

    def from_database(self, symbols, currency):
        """
        Fetch prices from database, for symbols that do not have prices yet.
        """
        ids = [int(s['id']) for s in symbols.values() if not s['prices']]
        if ids:
            q = alere.models.Prices.objects \
                .select_related('origin') \
                .filter(origin__in=ids,
                        target__iso_code=currency)

            for row in q:
                symbols[row.origin_id]['prices'].append(
                    (row.date.timestamp() * 1e3,
                     row.scaled_price / row.origin.price_scale)
                )

            for id in ids:
                symbols[id]['source'] = 'database'

    def from_yahoo(self, symbols):
        """
        Fetch prices from Yahoo
        """
        tickers = [s['ticker'] for s in symbols.values()
                   if s['source'] == "Yahoo Finance"]
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
                if s['ticker'] in d:
                    s['prices'] = [
                        (timestamp.timestamp() * 1e3, val)
                        for timestamp, val in d[s['ticker']].items()
                        if not math.isnan(val)
                    ]
                    s['prices'].sort(key=lambda v: v[0]) # order by timestamp

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

        #########
        # First step: find all commodities we trade.

        query = alere.models.Commodities.objects \
            .filter(latest_price__target__iso_code=currency) \
            .select_related(
                'latest_price', 'latest_price__origin', 'quote_source')

        symbols = {
            c.id: {
                "id": c.id,
                "name": c.name,
                "ticker": c.quote_symbol,
                "source": c.quote_source.name if c.quote_source else None,
                "prices": [],
                "currency": currency,
                "storedtime": c.latest_price.date.strftime("%Y-%m-%d"),
                "storedprice": c.latest_price.scaled_price /
                   c.latest_price.origin.price_scale,
            }
            for c in query
        }

        ########
        # Second step: get historical prices for those commodities

        if update:
            self.from_yahoo(symbols)
        # self.roi_from_balance(symbols, currency=currency)
        self.from_database(symbols, currency=currency)

        ########
        # Third step is to get the account details, for those accounts that
        # trade the above commodities.
        # For each account, we want to compute the Weighted Average and
        # Average Cost, which require that we look at each transaction done
        # for this account, and compute their total amount in shares and
        # currency.
        # One difficulty (!!! not handled here) is if multiple currencies
        # are used over several transactions, though this is unlikely (a stock
        # is traded in one currency).
        # Another difficulty is that for Weighted Average, we want to ignore
        # dividends (transactions with no shares) and Add or Remove shares
        # (with no money) transactions. So we post-process the result of the
        # query, rather than do everything in the database.

        query2 = alere.models.Accounts_Security.objects \
            .exclude(account__commodity__kind=
                       alere.models.CommodityKinds.CURRENCY) \
            .select_related('currency', 'account')

        def next_transaction(acc, trans):
            if acc is not None:
                acc['value'] += money_for_trans
                acc['shares'] += shares_for_trans
                if money_for_trans != 0 and shares_for_trans != 0:
                    acc['absshares'] += abs(shares_for_trans)
                    acc['absvalue'] += abs(money_for_trans)

            if trans is not None:
                return accs.setdefault(trans.account_id, {
                    "security": trans.account.commodity_id, # ??? do we need it
                    "account": trans.account_id,
                    "absvalue": 0,
                    "absshares": 0,
                    "value": 0,
                    "shares": 0,
                })

        acc = None   # account the current transaction is applying to
        current_transaction = None
        accs = {}
        for trans in query2:
            if trans.transaction_id != current_transaction:
                acc = next_transaction(acc, trans)
                current_transaction = trans.transaction_id
                shares_for_trans = 0
                money_for_trans = 0

            if trans.currency.kind == alere.models.CommodityKinds.CURRENCY:
                # Need '-' because this was for another account
                money_for_trans += -trans.scaled_qty / trans.scale
            else:
                shares_for_trans += trans.scaled_qty / trans.scale

        next_transaction(acc, None)

        return (
            sorted(symbols.values(), key=lambda r: r['name']),  # symbols
            list(accs.values()),   # accounts
        )

