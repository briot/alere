import { Account, CommodityId } from 'services/useAccounts';
import { ClosePrice } from 'PriceGraph';

//  When do we consider a number of shares to be zero (for rounding errors)
export const THRESHOLD = 0.00000001;

interface Position {
   avg_cost: number;
   equity: number;   // equity at maxdate
   gains: number;
   invested: number; //  how much we invested (including dividends)
   pl: number;       // profit-and-loss
   roi: number;      // return-on-investment
   shares: number;
   weighted_avg: number;
}

export interface AccountForTicker {
   account: Account;
   start: Position; // at mindate
   end: Position;   // at maxdate
   oldest_transaction: Date;   // date of oldest transaction
   most_recent_transaction: Date;
   now_for_annualized: Date;   // date to compute annualized return
   annualized_roi: number;
   period_roi: number;

   // sorted chronologically, given in the currency used in the query
   prices: ClosePrice[];
}

export interface Ticker {
   id: CommodityId;
   ticker: string;
   source: number;
   is_currency: boolean;
   accounts: AccountForTicker[];
}

/**
 * Data used to display information for one ticker+account. This includes
 * precomputed performance-related information.
 */
export interface RowData {
   ticker: Ticker;
   acc: AccountForTicker;
   dateRange: [Date, Date];
   currencyId: CommodityId;
}
