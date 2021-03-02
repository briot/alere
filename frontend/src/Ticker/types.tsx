import { Account, CommodityId } from 'services/useAccounts';

//  When do we consider a number of shares to be zero (for rounding errors)
export const THRESHOLD = 0.00000001;

export type ClosePrice = [
   number,  // timestamp
   number,  // price
   number,  // return-on-investment
];

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
   oldest: number;  // date of oldest transaction
   annualized_roi: number;
   period_roi: number;

   // sorted chronologically, given in the currency used in the query
   prices: ClosePrice[];
}

export interface Ticker {
   id: CommodityId;
   name: string;
   ticker: string;
   source: string;
   is_currency: boolean;
   accounts: AccountForTicker[];
}

/**
 * Various stats computed at some point in time for a ticker
 */
export interface ComputedTicker {
   close: number;     // most recent closing price
   oldest: Date;      // date of first investment
}

/**
 * Data used to display information for one ticker+account. This includes
 * precomputed performance-related information.
 */
export interface RowData {
   ticker: Ticker;
   acc: AccountForTicker;
   dateRange: [Date, Date];
   start: ComputedTicker;
   end: ComputedTicker;
   currencyId: CommodityId;
}
