from .json import JSONView
from forex_python.converter import CurrencyRates
import alere
import datetime
import django.db
import math
import time
import yfinance as yf


class OnlineView(JSONView):
    __yahoo_tickers_currency = {}
    # Mapping from ticker to currency for Yahoo

    def post_json(self, params, files, *args, **kwargs):
        self._update_yahoo(currency_id=1)
        self._cleanup_prices()
        return ""

    def _cleanup_prices(self):

        # Remove prices that are the same as the previous one (duplicate info).
        # Also only keep one value per date
        with django.db.connection.cursor() as cursor:
            cursor.execute("BEGIN")
            cursor.execute(
                """
                WITH prev_current AS (
                   SELECT
                     id,
                     date,
                     scaled_price AS current,
                     last_value(scaled_price)
                        OVER (PARTITION BY origin_id
                              ORDER BY date
                              ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING
                        ) AS prev,
                     last_value(date)
                        OVER (PARTITION BY origin_id
                              ORDER BY date
                              ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING
                        ) AS prev_date
                   FROM alr_prices
                )
                DELETE FROM alr_prices
                WHERE id IN (
                  SELECT id
                  FROM prev_current p
                  WHERE p.prev=p.current
                     OR p.prev_date=p.date
                )
                """
            )
            cursor.execute("COMMIT")

    def _update_forex(self):
        """
        Update exchange rates
        """
        c = CurrencyRates()
        c.get_rate('USD', 'EUR')

    def _update_yahoo(self, currency_id):
        now = datetime.datetime.now().astimezone(datetime.timezone.utc) \
                + datetime.timedelta(days=1)
        mindate = now - datetime.timedelta(days=370)

        #####
        # Find the symbols

        query = alere.models.Commodities.objects \
            .filter(quote_source=alere.models.PriceSources.YAHOO)
        tickers = {s.quote_symbol: s  for s in query}
        if not tickers:
            return

        intv = (now - mindate).total_seconds()
        period, interval = (
            ("1d", "5m")       if intv <= 86400
            #else ("5d", "1h")  if intv <= 5 * 86400
            else ("1mo", "1d") if intv <= 32 * 86400
            else ("3mo", "1d") if intv <= 94 * 86400
            else ("6mo", "5d") if intv <= 187 * 86400
            else ("1y", "1d")  if intv <= 367 * 86400
            else ("2y", "5d")  if intv <= 733 * 86400
            else ("5y", "1mo")  if intv <= 1831 * 86400
            else ("10y", "1mo") if intv <= 3661 * 86400
            else ("max", "1mo")   # also possible: "ytd" for period
                                  # "1m,2m,5m,15m,30m.60m,90m,1h,1d,5d,
                                  #  1wk,1mo,3mo" for interval
        )

        #####
        # The target currencies
        # ??? It is rather slow to get these currencies, because it has to
        # be done symbol-by-symbol. We could also store the online currency
        # in the database.

        default_currency = alere.models.Commodities.objects.get(id=currency_id)

        cids = set()
        for t in tickers:
            if t not in OnlineView.__yahoo_tickers_currency:
                tk = yf.Ticker(t)
                try:
                    OnlineView.__yahoo_tickers_currency[t] = tk.info['currency']
                except:
                    print('Exception while fetching currency for %s' % t)
                    OnlineView.__yahoo_tickers_currency[t] = \
                        default_currency.iso_code
            cids.add(OnlineView.__yahoo_tickers_currency[t])

        currencies = {
            c.iso_code: c
            for c in alere.models.Commodities.objects.filter(iso_code__in=cids)
        }

        data = yf.download(
            list(tickers.keys()),
            progress=False,
            start=mindate.strftime("%Y-%m-%d"),
            # end=now.strftime("%Y-%m-%d"),
            # period=period,
            interval=interval,
        )

        d = data['Adj Close'].to_dict()
        if len(tickers) == 1:
            # convert back to a dict
            d = {list(tickers.keys())[0]: d}

        alere.models.Prices.objects.bulk_create((
            alere.models.Prices(
                origin=tickers[ticker],
                target=currencies[
                    OnlineView.__yahoo_tickers_currency[ticker]
                ],
                date=datetime.datetime.fromtimestamp(
                    t.timestamp()).astimezone(datetime.timezone.utc),
                scaled_price=int(v * tickers[ticker].price_scale),
                source_id=alere.models.PriceSources.YAHOO,
            )
            for ticker, ticker_data in d.items()
            for t, v in ticker_data.items()
            if not math.isnan(v)
        ))
