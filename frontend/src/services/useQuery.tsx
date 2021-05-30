import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { DateRange, parseRange } from '@/Dates';
import useAccountIds, {
   AccountIdSet, AccountList } from '@/services/useAccountIds';
import useHistory from '@/services/useHistory';

export interface Selection {
   accounts: AccountList;
   range: DateRange | undefined;
   raw: Record<string, string>;
}

interface QueryDefaults {
   accountIds?: AccountIdSet;
   range?: DateRange;
}

// A custom hook that builds on useLocation to parse
// the query string for you.
const useQuery = (defaults?: QueryDefaults): Selection => {
   const r = Object.fromEntries(new URLSearchParams(useLocation().search));
   const { mostRecent, pushAccount } = useHistory();
   const accounts = useAccountIds(
      r.accounts ?? defaults?.accountIds ?? mostRecent);

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
      range: parseRange(r.range) ?? defaults?.range,
   };
};

export default useQuery;
