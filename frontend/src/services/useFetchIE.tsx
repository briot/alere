/**
 * Fetch Income and Expenses for a specified period of time
 */

import * as React from 'react';
import { DateRange, toDates } from '@/Dates';
import useFetch, { useFetchMultiple } from '@/services/useFetch';
import usePrefs from '@/services/usePrefs';
import useAccounts, {
   AccountId, CommodityId, Account, AccountList,
} from '@/services/useAccounts';

interface OneIEJSON {
   accountid: AccountId;
   value: number;         // total for this account in the time range
}
interface IncomeExpenseInPeriodJSON {
   items:   OneIEJSON[];
   mindate: string;
   maxdate: string;
}


export interface OneIE {
   accountId: AccountId;
   account: Account,
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
   include_expenses: boolean;
   include_income: boolean;
   range: DateRange;
}

const computeArgs = (
      include_income: boolean,
      include_expenses: boolean,
      range: DateRange,
      currencyId: CommodityId,
      accounts: AccountList,
) => {
   const r = toDates(range);
   return {
      cmd: 'income_expense',
      args: {
         income: include_income === true,
         expense: include_expenses === true,
         currency: currencyId,
         mindate: r[0],
         maxdate: r[1],
      },
      parse: (json: IncomeExpenseInPeriodJSON) => ({
         items: json.items.map(it => ({
            accountId: it.accountid,
            account: accounts.getAccount(it.accountid),
            value: it.value,
         })),
         mindate: json.mindate,
         maxdate: json.maxdate,
         total: json.items.reduce((tot, v) => tot + v.value, 0),
         currency: currencyId,
      }),
   };
}

const useFetchIE = (p: QueryProps): IncomeExpenseInPeriod=> {
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();

   // Need to compute this in useMemo, since a range of "up to now"
   // would have a different actual end date every time.
   // ??? Perhaps we should pass p.range directly to the backend.
   const args = React.useMemo(
      () => computeArgs(
         p.include_income,
         p.include_expenses,
         p.range,
         prefs.currencyId, accounts),
      [p.include_income, p.include_expenses, p.range,
       prefs.currencyId, accounts],
   );
   const { data }  = useFetch(args);
   return data ?? noData;
}
export default useFetchIE;

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
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const args = React.useMemo(
      () => ranges.map(r => computeArgs(
         true,  // include_income
         true,  // include_expenses
         r,
         prefs.currencyId,
         accounts,
      )),
      [ranges, accounts, prefs.currencyId],
   );
   const result = useFetchMultiple(args);
   const data = result.map(d => d.data ?? noData);
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
                        name: it.account.name,
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
