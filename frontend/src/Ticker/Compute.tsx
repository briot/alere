import { AccountForTicker, ComputedTicker, Ticker } from 'Ticker/types';
import { pastValue } from 'Ticker/Past';
import { DAY_MS } from 'services/utils';
import { Preferences } from 'services/usePrefs';

/**
 * Compute various performance indicators for a security
 */

const computeAtDate = (
   ticker: Ticker,
   a: AccountForTicker,
   atEnd: boolean,      // whether to use the "start" or "end" data
   ms_elapsed: number,  // how long ago was the "start" data
): ComputedTicker => {
   const price = pastValue(ticker, ms_elapsed);
   const shares = atEnd ? a.end.shares : a.start.shares;
   const worth = atEnd ? shares * price.toPrice : shares * price.fromPrice;
   const invested = atEnd ? a.end.value : a.start.value;
   const oldest = new Date(a.oldest * 1000);
   const latest = new Date(a.latest * 1000);
   return {
      close: price.toPrice || ticker.storedprice || NaN,
      weighted_avg:
         atEnd
         ? a.end.absvalue / a.end.absshares
         : a.start.absvalue / a.start.absshares,
      avg_cost: invested / shares,
      worth,
      invested,
      oldest,
      latest,
      annualized_return: (
         Math.pow(
            worth / invested,
            365 * DAY_MS / (new Date().getTime() - oldest.getTime()))
         - 1) * 100,
      annualized_return_recent: (
         Math.pow(
            worth / invested,
            365 * DAY_MS / (new Date().getTime() - latest.getTime()))
         - 1) * 100,
   };
}

export const computeTicker = (
   ticker: Ticker,
   acc: AccountForTicker,
   prefs: Preferences,
   dateRange: [Date, Date],
) => {
   const start = computeAtDate(
      ticker, acc, false, new Date().getTime() - dateRange[0].getTime());
   const end = computeAtDate(ticker, acc, true, 0);
   return {
      ticker,
      acc,
      start,
      end,
      currencyId: prefs.currencyId,
      dateRange: dateRange,
      periodReturn:
         end.worth / (start.worth + end.invested - start.invested) - 1,
   };
}
