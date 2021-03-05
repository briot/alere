from .json import nan_enc, JSONView
import alere
import datetime
import math


class Position:
    def __init__(self, r: alere.models.RoI =None):
        self.invested = r.invested if r is not None else 0
        self.gains = r.realized_gain if r is not None else 0
        self.weighted_avg = r.weighted_average if r is not None else 0
        self.avg_cost = r.average_cost if r is not None else 0
        self.roi = r.roi if r is not None else 0
        self.pl = r.pl if r is not None else 0
        self.shares = r.shares if r is not None else 0
        self.equity = r.balance if r is not None else 0

    def to_json(self):
        return {
            "avg_cost": nan_enc(self.avg_cost),
            "equity": nan_enc(self.equity),
            "gains": self.gains,
            "invested": self.invested,
            "pl": nan_enc(self.pl),
            "roi": nan_enc(self.roi),
            "shares": self.shares,
            "weighted_avg": nan_enc(self.weighted_avg),
        }

    def __repr__(self):
        return str(self.to_json())


class Account:
    """
    Details on an investment account
    """
    def __init__(self, account_id):
        self.account_id = account_id
        self.start = Position() # as of mindate
        self.end = Position()   # as of maxdate
        self.oldest = None      # date of oldest transaction (for annualized)
        self.most_recent = None # most recent transaction
        self.prices = []

    def to_json(self):
        now = datetime.datetime.now().astimezone(datetime.timezone.utc)

        # Annualized total return on investment
        if self.oldest and self.end.roi:
            d = (now - self.oldest).total_seconds() / 86400
            annualized_return = self.end.roi ** (365 / d)
        else:
            annualized_return = math.nan

        # Return over the period [mindate,maxdate]
        d = self.start.equity + self.end.invested - self.start.invested
        period_roi = (
            math.nan if abs(d) < 1e-6
            else (self.end.equity + self.end.gains - self.start.gains) / d
        )

        return {
            "account": self.account_id,
            "start": self.start,
            "end": self.end,
            "oldest": self.oldest.timestamp()
                if self.oldest is not None else 0,
            "most_recent": self.most_recent.timestamp()
                if self.most_recent is not None else 0,
            "now_for_annualized": now.timestamp(),
            "annualized_roi": nan_enc(annualized_return),
            "period_roi": nan_enc(period_roi),
            "prices": self.prices,
        }

    def __repr__(self):
        return str(self.to_json())


class Symbol:
    """
    Details on a traded symbol
    """
    def __init__(
            self,
            commodity_id: int,
            ticker: str,
            source: int,
            is_currency: bool,
            price_scale: int
        ):
        self.id = commodity_id
        self.source = source
        self.ticker = ticker
        self.accounts = []   # array of Account
        self.oldest = None
        self.is_currency = is_currency
        self.price_scale = price_scale

    def to_json(self):
        return {
            "id": self.id,
            "ticker": self.ticker,
            "source": self.source,
            "accounts": self.accounts,
            "is_currency": self.is_currency,
        }

    def __repr__(self):
        return str(self.to_json())


class QuotesView(JSONView):

    def get_json(self, params):
        currency = self.as_commodity_id(params, 'currency')
        commodities = params.get('commodities', None)
        accounts = params.get('accounts')  # comma-separate list of ids
        maxdate = self.as_time(params, 'maxdate')
        mindate = self.as_time(params, 'mindate')

        if accounts:
            accounts = [int(c) for c in accounts.split(',')]

        #########
        # Find all commodities

        query = alere.models.Commodities.objects.all()
        if commodities:
            query = query.filter(
                id__in=[int(c) for c in commodities.split(',')])

        symbols = {
            c.id: Symbol(
                commodity_id=c.id,
                ticker=c.quote_symbol,
                source=c.quote_source_id or alere.models.PriceSources.USER,
                is_currency=c.kind == alere.models.CommodityKinds.CURRENCY,
                price_scale=c.price_scale,
            )
            for c in query
        }

        ########
        # Find the corresponding accounts

        accs = {}

        query = alere.models.Accounts.objects \
            .filter(kind__in=alere.models.AccountFlags.trading()) \
            .select_related('commodity')
        if accounts is not None:
            query = query.filter(id__in=accounts)

        for row in query:
            a = accs[row.id] = Account(row.id)
            symbols[row.commodity_id].accounts.append(a)

        ########
        # Compute metrics

        query2 = alere.models.RoI.objects \
            .filter(account_id__in=accs.keys(),
                    commodity_id=currency) \
            .order_by("mindate")

        for r in query2:
            a = accs[r.account_id]

            if a.oldest is None:
                a.oldest = r.mindate
            a.most_recent = r.mindate

            if r.mindate <= mindate and mindate < r.maxdate:
                a.start = Position(r)

            if r.mindate <= maxdate and maxdate < r.maxdate:
                a.end = Position(r)

            a.prices.append({
                "t": r.mindate.timestamp() * 1e3,
                "price": r.computed_price,
                "roi": (r.roi - 1) * 100 if r.roi else None,
                "shares": r.shares,
            })

        return list(symbols.values())
