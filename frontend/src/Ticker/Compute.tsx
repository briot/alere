import { AccountForTicker, ComputedTicker, Ticker } from 'Ticker/types';
import { pastValue } from 'Ticker/Past';
import { Preferences } from 'services/usePrefs';

/**
 * Compute various performance indicators for a security
 */

const computeAtDate = (
   ticker: Ticker,
   a: AccountForTicker,
   ms_elapsed: number,  // how long ago was the "start" data
): ComputedTicker => {
   const price = pastValue(ticker, ms_elapsed);
   const oldest = new Date(a.oldest * 1000);
   const latest = new Date(a.latest * 1000);
   return {
      close: price.toPrice || ticker.storedprice || NaN,
      oldest,
      latest,
   };
}

export const computeTicker = (
   ticker: Ticker,
   acc: AccountForTicker,
   prefs: Preferences,
   dateRange: [Date, Date],
) => {
   const start = computeAtDate(
      ticker, acc, new Date().getTime() - dateRange[0].getTime());
   const end = computeAtDate(ticker, acc, 0);
   return {
      ticker,
      acc,
      start,
      end,
      currencyId: prefs.currencyId,
      dateRange: dateRange,
   };
}
