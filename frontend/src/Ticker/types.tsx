import { Account, CommodityId } from 'services/useAccounts';

//  When do we consider a number of shares to be zero (for rounding errors)
export const THRESHOLD = 0.00000001;

export type ClosePrice = [/*timestamp*/ number, /*close*/ number];

interface Position {
   absvalue: number;
   absshares: number;
   value: number;    //  how much we invested (including dividends)
   shares: number;
}

export interface AccountForTicker {
   account: Account;
   start: Position; // at mindate
   end: Position;   // at maxdate
   oldest: number;  // date of oldest transaction
   latest: number;  // date of most recent transaction
}

export interface Ticker {
   id: CommodityId;
   name: string;
   ticker: string;
   source: string;
   is_currency: boolean;

   storedtime: string;   // timestamp of last stored price
   storedprice: number|null;

   // sorted chronologically, given in the currency used in the query
   prices: ClosePrice[];
   accounts: AccountForTicker[];
}
