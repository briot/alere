from .json import JSONView
import alere
import bisect
import datetime
import django.db
from django.db.models import Max, Min
import math
import yfinance as yf


def enc(p):
    return (None if math.isnan(p) else p)

class Position:
    def __init__(self):
        self.invested = 0  # investments (including reinvested dividends). POSITIVE
        self.gains = 0     # realized gains. POSITIVE
        self.shares = 0    # increase in number of shares (from buying,
                           # adding for free, removing, selling,...)
        self.absvalue = 0  # sum of absolute values of investments and gains.
                           # does not include dividends
        self.absshares = 0 # sum of absolute values of shares. Does not include
                           # added or subtracted shares with no money traded
        self.equity = 0    # networth

    def _compute(self):
        # Average price at which we sold or bought shares
        self.weighted_avg = (
            math.nan if self.absshares == 0
            else self.absvalue / self.absshares
        )

        # Equivalent price for remaining shares (taking into account dividends)
        self.avg_cost = (
            math.nan if self.shares == 0
            else (self.invested - self.gains) / self.shares
        )

        # Return-on-Investment since beginning
        self.roi = (
            math.nan if self.invested == 0
            else (self.equity + self.gains) / self.invested
        )

        # Profit-and-Loss
        self.pl = (
            math.nan if self.invested == 0
            else self.equity + self.gains - self.invested
        )

    def to_json(self):
        self._compute()
        return {
            "avg_cost": enc(self.avg_cost),
            "equity": enc(self.equity),
            "gains": self.gains,
            "invested": self.invested,
            "pl": enc(self.pl),
            "roi": enc(self.roi),
            "shares": self.shares,
            "weighted_avg": enc(self.weighted_avg),
        }

    def __repr__(self):
        return str(self.to_json())

class Account:
    """
    Details on an investment account
    """
    def __init__(self, account_id, symbol: "Symbol"):
        self.account_id = account_id
        self.start = Position() # as of mindate
        self.end = Position()   # as of maxdate
        self.oldest = None      # date of oldest transaction (for annualized)
        self.latest = None      # date of most recent transaction
        self.symbol = symbol    # pointer to symbol

    def _compute(self):
        self.end._compute()

        now = datetime.datetime.now()

        # Annualized total return on investment
        if self.oldest:
            d = (now - self.oldest).total_seconds() / 86400
            self.annualized_return = self.end.roi ** (365 / d)
        else:
            self.annualized_return = math.nan

        # Annualized total return since most recent transaction
        if self.latest:
            d = (now - self.latest).total_seconds() / 86400
            self.annualized_return_recent = self.end.roi ** (365 / d)
        else:
            self.annualized_return_recent = math.nan

        # Return over the period [mindate,maxdate]
        d = self.start.equity + self.end.invested - self.start.invested
        self.period_roi = (
            math.nan if d == 0
            else (self.end.equity + self.end.gains - self.start.gains) / d
        )

    def to_json(self):
        self._compute()
        return {
            "account": self.account_id,
            "start": self.start,
            "end": self.end,
            "oldest": self.oldest,
            "latest": self.latest,
            "annualized_roi": enc(self.annualized_return),
            "annualized_roi_recent": enc(self.annualized_return_recent),
            "period_roi": enc(self.period_roi),
        }

    def __repr__(self):
        return str(self.to_json())

class Symbol:
    """
    Details on a traded symbol
    """
    def __init__(self, commodity_id, commodity_name, ticker, currency_id,
            stored_time: datetime.datetime,
            source: str = None,
            stored_price: float = None,
            is_currency=False,
        ):
        self.id = commodity_id
        self.prices = []
        self.source = source
        self.commodity_name = commodity_name
        self.ticker = ticker
        self.accounts = []   # array of Account
        self.currency_id = currency_id
        self.stored_time = stored_time.strftime("%Y-%m-%d"),
        self.stored_price = stored_price
        self.oldest = None
        self.is_currency = is_currency

    def add_account(self, acc: Account):
        self.accounts.append(acc)
        return acc

    def to_json(self):
        return {
            "id": self.id,
            "name": self.commodity_name,
            "ticker": self.ticker,
            "source": self.source,
            "prices": self.prices,
            "accounts": self.accounts,
            "currency": self.currency_id,
            "storedtime": self.stored_time,
            "storedprice": self.stored_price,
            "is_currency": self.is_currency,
        }

    def __repr__(self):
        return "Symbol(%d, %s, %s)" % (
            self.id, self.commodity_name, self.accounts)


def price_timestamp(d: datetime.datetime):
    return d.timestamp() * 1e3


class QuotesView(JSONView):

    def from_database(self, symbols, currency, mindate, maxdate):
        """
        Fetch prices from database, for symbols that do not have prices yet.
        """
        ids = [int(s.id) for s in symbols.values() if not s.prices]
        if ids:
            q = alere.models.Prices.objects \
                .select_related('origin') \
                .filter(origin__in=ids,
                        target_id=currency,
                        date__gte=mindate,
                        date__lte=maxdate)

            for row in q:
                symbols[row.origin_id].prices.append(
                    (price_timestamp(row.date),
                     row.scaled_price / row.origin.price_scale)
                )

            for id in ids:
                symbols[id].source = 'database'

    def from_yahoo(self, symbols, mindate):
        """
        Fetch prices from Yahoo
        """
        tickers = [s.ticker for s in symbols.values()
                   if s.source == "Yahoo Finance"]
        if tickers:
            intv = (datetime.datetime.now().astimezone(datetime.timezone.utc)
                    - mindate).total_seconds()
            period, interval = (
                ("1d", "5m")       if intv <= 86400
                #else ("5d", "1h")  if intv <= 5 * 86400
                else ("1mo", "1d") if intv <= 32 * 86400
                else ("3mo", "1d") if intv <= 94 * 86400
                else ("6mo", "5d") if intv <= 187 * 86400
                else ("1y", "5d")  if intv <= 367 * 86400
                else ("2y", "5d")  if intv <= 733 * 86400
                else ("5y", "1mo")  if intv <= 1831 * 86400
                else ("10y", "1mo") if intv <= 3661 * 86400
                else ("max", "1mo")   # also possible: "ytd" for period
                                      # "1m,2m,5m,15m,30m.60m,90m,1h,1d,5d,
                                      #  1wk,1mo,3mo" for interval
            )

            data = yf.download(
                tickers,
                # start="2020-01-01",
                period=period,
                interval=interval,
            )
            d = data['Adj Close'].to_dict()
            for s in symbols.values():
                if s.ticker in d:
                    s.prices = [
                        (price_timestamp(timestamp), val)
                        for timestamp, val in d[s.ticker].items()
                        if not math.isnan(val)
                    ]
                    s.prices.sort(key=lambda v: v[0]) # order by timestamp

    def get_json(self, params):
        now = datetime.datetime.now().astimezone(datetime.timezone.utc)

        update = self.as_bool(params, 'update', False)
        currency = self.as_commodity_id(params, 'currency')
        commodities = params.get('commodities', None)
        accounts = params.get('accounts')  # comma-separate list of ids
        maxdate = self.as_time(params, 'maxdate') or now
        mindate = self.as_time(params, 'mindate')

        if accounts:
            accounts = [int(c) for c in accounts.split(',')]

        if commodities:
            commodities = [int(c) for c in commodities.split(',')]

        #########
        # First step: find all commodities we trade.

        query = alere.models.Commodities.objects \
            .filter(latest_price__target_id=currency) \
            .select_related(
                'latest_price', 'latest_price__origin', 'quote_source')

        if commodities:
            query = query.filter(id__in=commodities)

        symbols = {
            c.id: Symbol(
                commodity_id=c.id,
                commodity_name=c.name,
                ticker=c.quote_symbol,
                currency_id=currency,
                source=c.quote_source.name if c.quote_source else None,
                stored_time=c.latest_price.date,
                stored_price=c.latest_price.scaled_price /
                   c.latest_price.origin.price_scale,
            )
            for c in query
        }

        ########
        # Second step: get historical prices for those commodities

        if update:
            self.from_yahoo(symbols, mindate=mindate)
        self.from_database(
            symbols, currency=currency, mindate=mindate, maxdate=maxdate)

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

        accs = {}

        def next_transaction(acc, trans):
            if acc is not None:
                if current_transaction_ts < mindate:
                    acc.start.gains += gains
                    acc.start.invested += invested
                    acc.start.shares += shares
                    if (gains + invested) != 0 and shares != 0:
                        acc.start.absshares += abs(shares)
                        acc.start.absvalue += abs(gains + invested)

                acc.end.gains += gains
                acc.end.invested += invested
                acc.end.shares += shares
                if (gains + invested) != 0 and shares != 0:
                    acc.end.absshares += abs(shares)
                    acc.end.absvalue += abs(gains + invested)

            if trans is not None:
                if trans.account_id in accs:
                    return accs[trans.account_id]
                s = symbols[trans.account.commodity_id]
                a = s.add_account(Account(trans.account_id, s))
                accs[trans.account_id] = a
                return a

        acc = None   # account the current transaction is applying to
        current_transaction_id = None
        current_transaction_ts = None
        query2 = alere.models.Accounts_Security.objects \
            .filter(account__commodity_id__in=symbols.keys()) \
            .select_related('currency', 'account')

        if accounts:
            query2 = query2.filter(account_id__in=accounts)

        try:
            for trans in query2:
                if trans.transaction_id != current_transaction_id:
                    acc = next_transaction(acc, trans)
                    current_transaction_id = trans.transaction_id
                    current_transaction_ts = trans.timestamp
                    invested = 0
                    gains = 0
                    shares = 0
                if trans.currency.kind == alere.models.CommodityKinds.CURRENCY:
                    if trans.scaled_qty > 0:
                        gains = trans.scaled_qty / trans.scale
                    else:
                        # Need '-' because this was for another account
                        invested -= trans.scaled_qty / trans.scale
                else:
                    shares += trans.scaled_qty / trans.scale

        except django.core.exceptions.EmptyResultSet:
            pass

        next_transaction(acc, None)

        # Add the investments accounts that are not related to a specific
        # security.

        flags = ",".join("'%s'" % f
            for f in alere.models.AccountFlags.networth()
                + (alere.models.AccountFlags.EQUITY, ))

        query3 = f"""
            SELECT
               invest.commodity_id,
               invest.id,
               SUM(s.value),
               alr_commodities.name,
               alr_commodities.iso_code
            FROM
               alr_accounts invest
               JOIN alr_splits for_account ON (invest.id=for_account.account_id)
               JOIN alr_transactions t ON (t.id=for_account.transaction_id)
               JOIN alr_splits_with_value s ON (s.transaction_id=t.id)
               JOIN alr_accounts ON (alr_accounts.id=s.account_id)
               JOIN alr_commodities ON (alr_commodities.id=invest.commodity_id)
            WHERE
               invest.kind_id = '{alere.models.AccountFlags.INVESTMENT}'
               AND s.account_id != invest.id
               AND alr_accounts.kind_id IN ({flags})
               AND s.value_currency_id=%s
            GROUP BY invest.commodity_id, invest.id
        """

        invest = []
        current_account = Account(-1, None)

        with django.db.connection.cursor() as cur:
            cur.execute(query3, [currency])
            for cur_id, account_id, value, com_name, iso in cur.fetchall():
                if accounts is None or account_id in accounts:
                    if cur_id not in symbols:
                        symbols[cur_id] = Symbol(
                            commodity_id=cur_id,
                            commodity_name=com_name,
                            ticker=iso,
                            currency_id=currency,
                            stored_price=None,
                            stored_time=now,
                            is_currency=True,
                        )
                    invest.append(account_id)
                    s = symbols[cur_id]
                    a = Account(account_id, s)
                    accs[account_id] = a

                    a.value = -value
                    s.add_account(a)

        # compute networth at mindate and maxdate for all accounts
        # This is computed the database for investment accounts, but using
        # number of shares and downloaded prices for stocks.
        if invest:
            query4 = alere.models.Balances_Currency.objects.filter(
                account_id__in=invest,
                commodity_id=currency,
                mindate__lte=mindate,
                maxdate__gt=mindate,
            )
            for b in query4:
                accs[b.account_id].start.equity = b.balance

            query4 = alere.models.Balances_Currency.objects.filter(
                account_id__in=invest,
                commodity_id=currency,
                mindate__lte=maxdate,
                maxdate__gt=maxdate,
            )
            for b in query4:
                accs[b.account_id].end.equity = b.balance

        for a in accs.values():
            if a not in invest:
                if not a.symbol.prices:
                    # ???
                    a.start.equity = math.nan
                    a.end.equity = math.nan
                else:
                    k = [p[0] for p in a.symbol.prices]   # the timestamps

                    idx = bisect.bisect(k, price_timestamp(mindate)) - 1
                    a.start.equity = a.start.shares * a.symbol.prices[idx][1]

                    idx = bisect.bisect(k, price_timestamp(maxdate)) - 1
                    a.end.equity = a.end.shares * a.symbol.prices[idx][1]

        # Compute oldest transaction date for all accounts. These are the
        # transactions to or from other bank accounts (so that for instance
        # we ignore "unrealized gains")

        syds = ",".join("%d" % s for s in accs)
        query5 = f"""
            SELECT
               alr_splits.account_id,
               MIN(s.post_date) as oldest,
               MAX(s.post_date) as latest
            FROM
               alr_splits
               JOIN alr_transactions t ON (t.id=alr_splits.transaction_id)
               JOIN alr_splits s ON (s.transaction_id=t.id)
               JOIN alr_accounts ON (alr_accounts.id=s.account_id)
            WHERE
               alr_splits.account_id IN ({syds})
               AND s.account_id != alr_splits.account_id
               AND alr_accounts.kind_id IN ({flags})
            GROUP BY alr_splits.account_id
        """
        with django.db.connection.cursor() as cur:
            cur.execute(query5)
            for a, oldest, latest in cur.fetchall():
                accs[a].oldest = datetime.datetime.fromisoformat(oldest)
                accs[a].latest = datetime.datetime.fromisoformat(latest)

        return sorted(symbols.values(), key=lambda r: r.commodity_name)

