/**
 * Fetch Income and Expenses for a specified period of time
 */

import * as React from 'react';
import { DateRange, rangeToHttp } from '@/Dates';
import useFetch, { useFetchMultiple, FetchProps } from '@/services/useFetch';
import usePrefs from '@/services/usePrefs';
import useAccounts, {
   AccountId, CommodityId, Account, AccountList
} from '@/services/useAccounts';

export interface OneIE {
   accountId: AccountId;
   account: Account | undefined;
   name: string;          // name to display for the account
   value: number;         // total for this account in the time range
}
export interface IncomeExpenseInPeriod {
   items:   OneIE[];
   mindate: string;
   maxdate: string;
   total:   number;
   currency: CommodityId;
}
const noData: IncomeExpenseInPeriod = {
   items: [], mindate: 'today', maxdate: 'today', total: 0, currency: -1};

// The details for one query
interface QueryProps {
   include_expenses?: boolean;
   include_income?: boolean;
   range: DateRange;
}

const toFetchProps = (
   p: QueryProps,
   accounts: AccountList,
   currency: CommodityId,
): FetchProps<IncomeExpenseInPeriod, IncomeExpenseInPeriod> => ({
   url: `/api/incomeexpense?income=${p.include_income === true}`
      + `&expense=${p.include_expenses === true}`
      + `&currency=${currency}`
      + `&${rangeToHttp(p.range)}`,
   parse: (json: IncomeExpenseInPeriod) => {
      const d = {
         items: json.items,
         mindate: json.mindate,
         maxdate: json.maxdate,
         total: json.items.reduce((tot, v) => tot + v.value, 0),
         currency,
      };
      d.items.forEach(a => {
         a.account = accounts.getAccount(a.accountId);
         a.name = a.account?.name;
      });
      return d;
   },
   placeholder: noData,
});


const useFetchIE = (p: QueryProps): IncomeExpenseInPeriod|undefined => {
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const { data }  = useFetch(toFetchProps(p, accounts, prefs.currencyId));
   return data;
}
export default useFetchIE;

/**
 * Perform one or more queries to retrieve Income/Expense
 */
export const useFetchIEMulti = (
   p: QueryProps[]
): (IncomeExpenseInPeriod|undefined)[] => {
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const result = useFetchMultiple(
      p.map(q => toFetchProps(q, accounts, prefs.currencyId)));
   return result.map(d => d.data);
}

/**
 * Retrieve Income/Expense for multiple periods of times. For each account,
 * include the amount for each of the time periods.
 */

export interface IERanges {
   account: Account | undefined;
   accountId: AccountId;
   values: number[];  // on per range in the request
   name: string;
   currency: CommodityId;
}

export const useFetchIERanges = (
   ranges: DateRange[],
): Record<AccountId, IERanges> => {
   const data = useFetchIEMulti(
      ranges.map(r => ({
         include_income: true,
         include_expenses: true,
         range: r,
      }))
   );
   const account_to_data = React.useMemo(
      () => {
         const perAccount: Record<AccountId, IERanges> = {};
         data.forEach((d, idx) => {
            if (d) {
               d.items.forEach(it => {
                  let a = perAccount[it.accountId];
                  if (!a) {
                     a = perAccount[it.accountId] = {
                        account: it.account,
                        accountId: it.accountId,
                        values: new Array(ranges.length).fill(NaN),
                        name: it.name,
                        currency: d.currency,
                     };
                  }
                  a.values[idx] = it.value;
               });
            }
         });
         return perAccount;
      },
      [data, ranges]
   );
   return account_to_data;
}
