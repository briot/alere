from .json import JSONView
import alere
import bisect
from django.db import connection, models
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
        self.prices = []

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
            "prices": self.prices,
        }

    def __repr__(self):
        return str(self.to_json())


class Symbol:
    """
    Details on a traded symbol
    """
    def __init__(self, commodity_id, commodity_name, ticker,
            source: str,
            is_currency: bool,
            price_scale: int
        ):
        self.id = commodity_id
        self.source = source
        self.commodity_name = commodity_name
        self.ticker = ticker
        self.accounts = []   # array of Account
        self.oldest = None
        self.is_currency = is_currency
        self.price_scale = price_scale

    def add_account(self, acc: Account):
        self.accounts.append(acc)
        return acc

    def to_json(self):
        return {
            "id": self.id,
            "name": self.commodity_name,
            "ticker": self.ticker,
            "source": self.source,
            "accounts": self.accounts,
            "is_currency": self.is_currency,
        }

    def __repr__(self):
        return "Symbol(%d, %s, %s)" % (
            self.id, self.commodity_name, self.accounts)


class Tmp_RoI(alere.models.AlereModel):
    """
    Return-on-Investment at any point in time
    """
    mindate = models.DateTimeField()   # included in range
    maxdate = models.DateTimeField()   # not included in range
    first_date = models.DateTimeField()  # date of oldest transaction
    account = models.ForeignKey(
        alere.models.Accounts, on_delete=models.DO_NOTHING, related_name='roi')
    commodity = models.ForeignKey(
        alere.models.Commodities,
        on_delete=models.DO_NOTHING,
        related_name='+'
    )
    balance = models.FloatField() # The current balance, in commodity
    shares = models.FloatField()  # Number of shares owned
    computed_price = models.FloatField()

    invested = models.FloatField()      # Amount invested so far, unscaled
    realized_gain = models.FloatField() # Realized gains so far, unscaled
    roi = models.FloatField()           # Return on Investment so far, unscaled
    pl = models.FloatField()            # P&L so far, unscaled

    average_cost = models.FloatField()
    # average cost for one share, taking into account the amount invested and
    # the realized gains so far.

    weighted_average = models.FloatField()
    # average price we bought or sold shares

    class Meta:
        managed = False
        db_table = "roi_tmp"

    def __str__(self):
        return "RoI([%s,%s), roi=%s)" % (self.mindate, self.maxdate, self.roi)


def price_timestamp(d: datetime.datetime):
    return d.timestamp() * 1e3


def _create_tmp_prices(cursor):
    cursor.execute(
        "CREATE TEMPORARY TABLE tmp_prices ("
        " id INTEGER PRIMARY KEY AUTOINCREMENT,"
        " origin_id INTEGER NOT NULL,"
        " target_id INTEGER NOT NULL,"
        " date TEXT NOT NULL,"
        " scaled_price REAL NOT NULL,"
        " source INTEGER NOT NULL"
        ")")


def _create_tmp_price_from_db(
        cursor, symbols, currency, mindate, maxdate):
    """
    Fill the tmp_prices table from the prices table
    """
    syds = [s.id for s in symbols.values() if s.source is None]
    if syds:
        cursor.execute(
            (
                "INSERT INTO tmp_prices"
                "(origin_id,target_id,date,scaled_price,source)"
                " SELECT"
                "    alr_prices.origin_id,"
                "    alr_prices.target_id,"
                "    alr_prices.date AS date,"
                "    alr_prices.scaled_price,"
                "    alr_prices.source"
                " FROM alr_prices, alr_commodities origin"
                " WHERE origin.id IN ({syds})"
                " AND alr_prices.target_id = %s"
                " AND alr_prices.date >= %s"
                " AND alr_prices.date <= %s"
                " AND alr_prices.origin_id = origin.id"
            ).format(syds=','.join(str(s) for s in syds)),
            (currency, mindate, maxdate)
        )


def _create_tmp_price_from_yahoo(
        cursor, symbols, currency: int, mindate, maxdate):
    """
    Fill the tmp_prices table from the prices table
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

        # ??? This is not in "currency" ?
        data = yf.download(
            tickers,
            # start="2020-01-01",
            period=period,
            interval=interval,
        )
        d = data['Adj Close'].to_dict()

        price_scale = symbols[currency].price_scale
        yahoo = alere.models.PriceSources.get(name="Yahoo Finance").id

        cursor.executemany(
            "INSERT INTO tmp_prices"
            "(origin_id,target_id,date,scaled_price,source)"
            "VALUES (%s, %s, %s, %s, %d)",
            ((s.ticker, currency, t, v * price_scale, yahoo)
              for t, v in d[s.ticker].items()
              if not math.isnan(v))
        )


class QuotesView(JSONView):

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
                price_scale=c.price_scale,
            )
            for c in query
        }

        ########
        # Second: Find the corresponding accounts

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
        # Third step: prepare the prices

        with django.db.connection.cursor() as cur:
            cur.execute("BEGIN")
            cur.execute("PRAGMA temp_store=MEMORY")

            if update:
                # ??? Should compute intervals
                _create_tmp_prices(cur)
                _create_tmp_price_from_db(
                    cur, symbols, currency, mindate, maxdate)
                _create_tmp_price_from_yahoo(
                    cur, symbols, currency, mindate, maxdate)
                prices = 'tmp_prices'
            else:
                prices = 'alr_price_history'

        ########
        # Fourth step: compute metrics
        # Create a temporary table since we need to extract info for multiple
        # dates, and it is a slow query

            networth_flags = list(alere.models.AccountFlags.networth()) + \
                [alere.models.AccountFlags.EQUITY]

            roi = (
                f"""
           WITH internal_splits AS (
              SELECT s3.transaction_id,
                 CAST(s3.scaled_qty AS FLOAT) / a.commodity_scu AS qty,
                 s3.account_id,
                 s3.post_date
              FROM alr_splits s3 JOIN alr_accounts a ON (s3.account_id = a.id)
              WHERE a.kind_id IN ({','.join("'%s'" % f for f in networth_flags)})
           ),

           --  For all accounts, compute the total amount invested (i.e. money
           --  transfered from other user accounts) and realized gains (i.e.
           --  money transferred to other user accounts).
           --
           --  One difficulty (!!! not handled here) is if multiple currencies
           --  are used over several transactions, though this is unlikely (a
           --  stock is traded in one currency).

           balances AS (
              SELECT
                 a.id AS account_id,
                 a.commodity_id,
                 s.post_date AS mindate,
                 COALESCE(
                    MAX(s.post_date)
                       OVER (PARTITION BY a.id
                             ORDER by s.post_date
                             ROWS BETWEEN 1 FOLLOWING AND 1 FOLLOWING),
                    '2999-12-31 00:00:00'
                   ) AS maxdate,
                 CAST( SUM(CASE WHEN s.account_id = s2.account_id
                                THEN s.scaled_qty ELSE 0 END)
                    OVER (PARTITION BY a.id
                          ORDER BY s.post_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                    AS FLOAT
                   ) / a.commodity_scu
                   AS shares,
                 FIRST_VALUE(s.post_date)
                    OVER (PARTITION BY a.id ORDER BY s.post_date)
                    AS first_date,
                 SUM(CASE WHEN s.account_id <> s2.account_id AND s2.qty < 0
                          THEN -s2.qty ELSE 0 END)
                    OVER (PARTITION BY s.account_id
                          ORDER BY s.post_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                    AS invested,
                 SUM(CASE WHEN s.account_id <> s2.account_id AND s2.qty > 0
                          THEN s2.qty ELSE 0 END)
                    OVER (PARTITION BY s.account_id
                          ORDER BY s.post_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                    AS realized_gain,
                 SUM(CASE WHEN s.account_id <> s2.account_id AND s2.qty <> 0
                            AND s.scaled_qty <> 0
                         THEN abs(s2.qty) ELSE 0 END)
                    OVER (PARTITION BY s.account_id
                          ORDER BY s.post_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                    AS invested_for_shares,
                 CAST(SUM(CASE WHEN s.account_id <> s2.account_id
                            AND s2.qty <> 0 AND s.scaled_qty <> 0
                          THEN abs(s.scaled_qty) ELSE 0 END)
                       OVER (PARTITION BY s.account_id
                             ORDER BY s.post_date
                             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                      AS FLOAT)
                    / a.commodity_scu
                    AS shares_transacted
              FROM alr_splits s
                 JOIN alr_accounts a ON (s.account_id = a.id)
                 JOIN internal_splits s2 USING (transaction_id)
           )

           --  For all accounts, compute the return on investment at any point
           --  in time, by combining the balance at that time with the total
           --  amount invested that far and realized gains moved out of the
           --  account.

           SELECT
              row_number() OVER () as id,   --  for django's sake
              target.id as commodity_id,
              max(b.mindate, p.mindate) as mindate,
              min(b.maxdate, p.maxdate) as maxdate,
              CAST(b.shares * p.scaled_price AS FLOAT) / source.price_scale
                 AS balance,
              CAST(p.scaled_price AS FLOAT) / source.price_scale
                 AS computed_price,
              b.realized_gain,
              b.invested,
              b.shares,
              b.first_date,
              b.account_id,
              (CAST(b.shares * p.scaled_price AS FLOAT) / source.price_scale
                 + b.realized_gain) / (b.invested) as roi,
              CAST(b.shares * p.scaled_price AS FLOAT) / source.price_scale
                 + b.realized_gain - b.invested as pl,
              (b.invested - b.realized_gain) / b.shares as average_cost,
              (b.invested_for_shares / b.shares_transacted) as weighted_average
           FROM
              balances b
              JOIN {prices} p ON (b.commodity_id = p.origin_id)

              --  price from: the account's commodity
              JOIN alr_commodities source ON (b.commodity_id = source.id)

              --  price target: the user's requested commodity, can only be
              --  a currency
              JOIN alr_commodities target
                 ON (p.target_id = target.id AND target.kind = 'C')
           WHERE
              b.account_id IN ({','.join(str(d) for d in accs)})

              --  intervals intersect
              AND b.mindate < p.maxdate
              AND p.mindate < b.maxdate
            ORDER BY mindate
                """
            )

            cur.execute(f"CREATE TEMP TABLE roi_tmp AS {roi}")

            query2 = Tmp_RoI.objects.all()
            for r in query2:
                a = accs[r.account_id]

                if r.mindate <= mindate and mindate < r.maxdate:
                    a.start.gains = r.realized_gain
                    a.start.invested = r.invested
                    a.start.weighted_avg = r.weighted_average
                    a.start.avg_cost = r.average_cost
                    a.start.roi = r.roi
                    a.start.pl = r.pl
                    a.start.shares = r.shares
                    a.start.equity = r.balance

                    a.oldest = r.first_date

                if r.mindate <= maxdate and maxdate < r.maxdate:
                    a.end.gains = r.realized_gain
                    a.end.invested = r.invested
                    a.end.weighted_avg = r.weighted_average
                    a.end.avg_cost = r.average_cost
                    a.end.roi = r.roi
                    a.end.pl = r.pl
                    a.end.shares = r.shares
                    a.end.equity = r.balance

                a.prices.append(
                    (price_timestamp(r.mindate),
                     r.computed_price,
                     r.roi))

        return list(symbols.values())

