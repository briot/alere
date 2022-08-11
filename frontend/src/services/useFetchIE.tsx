/**
 * Fetch Income and Expenses for a specified period of time
 */

import * as React from 'react';
import { DateRange, toDates } from '@/Dates';
import useFetch, { useFetchMultiple } from '@/services/useFetch';
import usePrefs from '@/services/usePrefs';
import useAccounts, {
   AccountId, CommodityId, Account
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
   include_expenses?: boolean;
   include_income?: boolean;
   range: DateRange;
}

const useFetchIE = (p: QueryProps): IncomeExpenseInPeriod=> {
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const args = React.useMemo(
      () => {
         // Need to compute this in useMemo, since a range of "up to now"
         // would have a different actual end date everytime.
         // ??? Perhaps we should pass p.range directly to the backend.
         const r = toDates(p.range);
         return {
            cmd: 'income_expense',
            args: {
               income: p.include_income === true,
               expense: p.include_expenses === true,
               currency: prefs.currencyId,
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
               currency: prefs.currencyId,
            }),
         };
      },
      [p.range, p.include_income, p.include_expenses, prefs.currencyId,
       accounts]
   );
   const { data }  = useFetch(args);
   return data ?? noData;
}
export default useFetchIE;

/**
 * Perform one or more queries to retrieve Income/Expense
 */
export const useFetchIEMulti = (
   p: QueryProps[]
): (IncomeExpenseInPeriod)[] => {
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const args = React.useMemo(
      () => p.map(q => {
         // Need to compute this in useMemo, since a range of "up to now"
         // would have a different actual end date everytime.
         // ??? Perhaps we should pass p.range directly to the backend.
         const r = toDates(q.range);
         return {
            cmd: 'income_expense',
            args: {
               income: q.include_income === true,
               expense: q.include_expenses === true,
               currency: prefs.currencyId,
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
               currency: prefs.currencyId,
            }),
         };
      }),
      [p, accounts, prefs.currencyId],
   );
   const result = useFetchMultiple(args);
   return result.map(d => d.data ?? noData);
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
