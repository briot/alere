/**
 * Fetch Income and Expenses for a specified period of time
 */

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

export const useFetchIEMulti = (
   p: QueryProps[]
): (IncomeExpenseInPeriod|undefined)[] => {
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const result = useFetchMultiple(
      p.map(q => toFetchProps(q, accounts, prefs.currencyId)));
   return result.map(d => d.data);
}

export default useFetchIE;

