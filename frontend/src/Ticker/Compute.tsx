import { AccountForTicker, Ticker } from 'Ticker/types';
import { Preferences } from 'services/usePrefs';

/**
 * Compute various performance indicators for a security
 */

export const computeTicker = (
   ticker: Ticker,
   acc: AccountForTicker,
   prefs: Preferences,
   dateRange: [Date, Date],
) => {
   const mindate = new Date(
      Math.max(acc.oldest_transaction.getTime(), dateRange[0].getTime()));
   const maxdate = new Date(
      Math.min(acc.most_recent_transaction.getTime(), dateRange[1].getTime()));
   return {
      ticker,
      acc,
      currencyId: prefs.currencyId,
      dateRange: [mindate, maxdate] as [Date, Date],
   };
}
