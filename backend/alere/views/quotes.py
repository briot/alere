from .json import JSONView
import alere
import datetime
import django.db
from django.db.models import Max, Min
import math
import yfinance as yf


class Account:
    """
    Details on an investment account
    """
    def __init__(self, account_id):
        self.account_id = account_id
        self.absvalue = 0
        self.absshares = 0
        self.value = 0
        self.shares = 0
        self.balance = None
        self.oldest = None
        self.latest = None

    def to_json(self):
        return {
            "account": self.account_id,
            "absvalue": self.absvalue,
            "absshares": self.absshares,
            "value": self.value,
            "shares": self.shares,
            "balance": self.balance,
            "oldest": self.oldest,
            "latest": self.latest,
        }


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
        self.accounts = []
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


class QuotesView(JSONView):

    def from_database(self, symbols, currency):
        """
        Fetch prices from database, for symbols that do not have prices yet.
        """
        ids = [int(s.id) for s in symbols.values() if not s.prices]
        if ids:
            q = alere.models.Prices.objects \
                .select_related('origin') \
                .filter(origin__in=ids,
                        target_id=currency)

            for row in q:
                symbols[row.origin_id].prices.append(
                    (row.date.timestamp() * 1e3,
                     row.scaled_price / row.origin.price_scale)
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

    def get_json(self, params):
        update = self.as_bool(params, 'update', False)
        currency = self.as_commodity_id(params, 'currency')
        commodities = params.get('commodities', None)

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
            self.from_yahoo(symbols)
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

        accs = {}

        def next_transaction(acc, trans):
            if acc is not None:
                acc.value += money_for_trans
                acc.shares += shares_for_trans
                if money_for_trans != 0 and shares_for_trans != 0:
                    acc.absshares += abs(shares_for_trans)
                    acc.absvalue += abs(money_for_trans)

            if trans is not None:
                if trans.account_id in accs:
                    return accs[trans.account_id]
                a = symbols[trans.account.commodity_id].add_account(
                    Account(trans.account_id))
                accs[trans.account_id] = a
                return a

        acc = None   # account the current transaction is applying to
        current_transaction = None
        query2 = alere.models.Accounts_Security.objects \
            .filter(account__commodity_id__in=symbols.keys()) \
            .select_related('currency', 'account')

        try:
            for trans in query2:
                if trans.transaction_id != current_transaction:
                    acc = next_transaction(acc, trans)
                    current_transaction = trans.transaction_id
                    shares_for_trans = 0
                    money_for_trans = 0

                if trans.currency.kind == alere.models.CommodityKinds.CURRENCY:
                    # Need '-' because this was for another account
                    money_for_trans -= trans.scaled_qty / trans.scale
                else:
                    shares_for_trans += trans.scaled_qty / trans.scale

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
        current_account = Account(-1)
        now = datetime.datetime.now().astimezone(datetime.timezone.utc)

        with django.db.connection.cursor() as cur:
            cur.execute(query3, [currency])
            for cur_id, account_id, value, com_name, iso in cur.fetchall():
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
                a = Account(account_id)
                accs[account_id] = a

                a.value = -value
                symbols[cur_id].add_account(a)

        # compute current networth for the investment accounts
        query4 = alere.models.Balances_Currency.objects.filter(
            account_id__in=invest,
            commodity_id=currency,
            mindate__lte=now,
            maxdate__gt=now,
        )
        for b in query4:
            accs[b.account_id].balance = b.balance

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
                accs[a].oldest = datetime.datetime.fromisoformat(oldest).timestamp()
                accs[a].latest = datetime.datetime.fromisoformat(latest).timestamp()

        return sorted(symbols.values(), key=lambda r: r.commodity_name)

