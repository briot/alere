import * as React from 'react';
import { AccountId, CommodityId } from 'services/useAccounts';
import { RelativeDate, dateToString } from 'Dates';

/**
 * The balance for a specific account, at a specific date.
 * This includes the number of shares, and a price computed from data available
 * in the database (we take the "last available price" at that date valuation).
 * For accounts that are not stocks, the number of shares will be set to 1.
 * The current value of the account is always shares*price, and given in the
 * currency specified in BalanceList.
 */

export interface Balance {
   accountId: AccountId;
   atDate: {
      shares: number;
      price: number;  // or NaN
   }[];
}

/**
 * The balance for all the accounts, at various dates.
 * All the lists share the same index, so you can retrieve the date, the
 * current account value, the total value,... using the same index.
 * The total value is the total for all accounts, even if some of those
 * accounts are filtered out from the list for various reasons (value below a
 * threshold,....)
 */

export interface BalanceList {
   currencyId: CommodityId;
   dates: RelativeDate[];
   list: Balance[];   // indexed on date
   totalValue: number[];  // indexed on date
}
const noBalanceList: BalanceList = {
   list: [], dates: [], totalValue: [], currencyId: -1};

/**
 * As fetched from the server
 */

interface JSONBalance {
   accountId: AccountId;
   shares: number[];
   price: (number|undefined)[];
}

/**
 * For each date specified in `dates`, fetch the current price and number of
 * shares for each account (for now we only fetch for Asset accounts)
 * We also compute the total owned by the user. For this, we need to convert
 * all values to a common currency (`currencyId`). This will include exchange
 * rates to convert to that common currency.
 */

const useBalance = (p: {
   currencyId: CommodityId;
   dates: RelativeDate[];
}): BalanceList => {
   const [ data, setData ] = React.useState(noBalanceList);
   React.useEffect(
      () => {
         const doFetch = async () => {
            const resp = await window.fetch(
               `/api/plots/networth`
               + `?currency=${p.currencyId}`
               + `&dates=${p.dates.map(dateToString).join(',')}`
            );
            const list: JSONBalance[] = await resp.json()
            setData({
               dates: p.dates,
               currencyId: p.currencyId,
               list: list.map(a => ({
                  accountId: a.accountId,
                  atDate: p.dates.map((date, idx) => ({
                     shares: a.shares[idx],
                     price: a.price[idx] ?? NaN,
                  })),
               })),
               totalValue: p.dates.map((_, idx) =>
                  list
                  .filter(d => d.price[idx])  // remove undefined and NaN
                  .reduce((t, d) => t + d.price[idx]! * d.shares[idx], 0)),
            });
         }
         doFetch();
      },
      [p.currencyId, p.dates]
   );
   return data;
}

export default useBalance;
