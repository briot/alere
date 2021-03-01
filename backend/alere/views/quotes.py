from .json import JSONView
import alere
import bisect
from django.db import connection
import datetime
import django.db
import math
import yfinance as yf


def enc(p):
    return (None if p is None or math.isnan(p) else p)

class Position:
    def __init__(self):
        self.invested = 0  # investments (including reinvested dividends). POSITIVE
        self.gains = 0     # realized gains. POSITIVE
        self.shares = 0    # increase in number of shares (from buying,
                           # adding for free, removing, selling,...)
        self.equity = 0    # networth

        # Average price at which we sold or bought shares
        self.weighted_avg = 0

        # Equivalent price for remaining shares (taking into account dividends)
        self.avg_cost = 0

        # Return-on-Investment since beginning
        self.roi = 0

        # Profit-and-Loss
        self.pl = 0

    def to_json(self):
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
        self.symbol = symbol    # pointer to symbol

    def _compute(self):
        now = datetime.datetime.now().astimezone(datetime.timezone.utc)

        # Annualized total return on investment
        if self.oldest and self.end.roi:
            d = (now - self.oldest).total_seconds() / 86400
            self.annualized_return = self.end.roi ** (365 / d)
        else:
            self.annualized_return = math.nan

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
            "annualized_roi": enc(self.annualized_return),
            "period_roi": enc(self.period_roi),
        }

    def __repr__(self):
        return str(self.to_json())

class Symbol:
    """
    Details on a traded symbol
    """
    def __init__(self, commodity_id, commodity_name, ticker,
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
                        date__lt=maxdate + datetime.timedelta(days=1))

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

        accs = {}
        invest = []

        #########
        # First step: find all commodities

        query = alere.models.Commodities.objects \
            .select_related('quote_source')

        if commodities:
            query = query.filter(
                id__in=[int(c) for c in commodities.split(',')])

        symbols = {
            c.id: Symbol(
                commodity_id=c.id,
                commodity_name=c.name,
                ticker=c.quote_symbol,
                source=c.quote_source.name if c.quote_source else None,
                is_currency=c.kind == alere.models.CommodityKinds.CURRENCY,
            )
            for c in query
        }

        ########
        # Second step: get historical prices for those commodities

        if update:
            self.from_yahoo(symbols, mindate=mindate)
        else:
            self.from_database(
                symbols, currency=currency, mindate=mindate, maxdate=maxdate)

        ########
        # Third: Find the corresponding accounts

        query = alere.models.Accounts.objects \
            .filter(kind__in=alere.models.AccountFlags.trading()) \
            .select_related('commodity')
        if accounts is not None:
            query = query.filter(id__in=accounts)

        for row in query:
            s = symbols[row.commodity_id]
            a = accs[row.id] = Account(row.id, s)
            s.add_account(a)

        ########
        # Fourth step: compute metrics
        # Create a temporary table since we need to extract info for multiple
        # dates, and it is a slow query

        with django.db.connection.cursor() as cur:
            cur.execute(
               "CREATE TEMP TABLE roi_tmp AS "
               "SELECT * FROM alr_roi"
               " WHERE account_id IN (%s)"
               % ",".join('%d' % id for id in accs.keys()))

            query2 = alere.models.RoI.objects \
                .filter(account_id__in=accs.keys(),
                        mindate__lte=mindate,
                        maxdate__gt=mindate) \
                .select_related('account')

            for r in query2:
                a = accs[r.account_id]
                a.start.gains = r.realized_gain
                a.start.invested = r.invested
                a.start.weighted_avg = r.weighted_average
                a.start.avg_cost = r.average_cost
                a.start.roi = r.roi
                a.start.pl = r.pl
                a.start.shares = r.shares
                a.start.equity = r.balance

            query2 = alere.models.RoI.objects \
                .filter(account_id__in=accs.keys(),
                        mindate__lte=maxdate,
                        maxdate__gt=maxdate) \
                .select_related('account')

            for r in query2:
                a = accs[r.account_id]
                a.end.gains = r.realized_gain
                a.end.invested = r.invested
                a.end.weighted_avg = r.weighted_average
                a.end.avg_cost = r.average_cost
                a.end.roi = r.roi
                a.end.pl = r.pl
                a.end.shares = r.shares
                a.end.equity = r.balance

                a.oldest = r.first_date

        return list(symbols.values())

