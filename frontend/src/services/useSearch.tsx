import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { DateRange, parseRange } from '@/Dates';
import useAccountIds, {
   AccountIdSet, AccountSet } from '@/services/useAccountIds';
import useHistory from '@/services/useHistory';

export interface Selection {
   accounts: AccountSet;
   range: DateRange | undefined;
   raw: Record<string, string>;
   accountIds: AccountIdSet;
   date: Date;  //  a reference date (in general: today)
}

interface QueryDefaults {
   accountIds?: AccountIdSet;
   range?: DateRange;
}

// A custom hook that builds on useLocation to parse
// the query string for you.
const useSearch = (defaults?: QueryDefaults): Selection => {
   const r = Object.fromEntries(new URLSearchParams(useLocation().search));
   const { mostRecent, pushAccount } = useHistory();
   const accountIds = (
      r.accounts ?? defaults?.accountIds ?? mostRecent
   ) as AccountIdSet;  // what if the user provides an invalid string ?
   const accounts = useAccountIds(accountIds);

   // Save chosen accounts to "most Recent" history
   React.useEffect(
      () => {
         if (accounts.accounts.length === 1) {
            pushAccount(accounts.accounts[0].id);
         }
      },
      [accounts, pushAccount ]
   );

   return {
      raw: r,
      accounts,
      accountIds,
      date: r.date ? new Date(r.date) : new Date(),
      range: parseRange(r.range) ?? defaults?.range,
   };
};

export default useSearch;
