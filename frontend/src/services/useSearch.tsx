import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { DateRange, parseRange } from '@/Dates';
import useAccountIds, {
   AccountIdSet, AccountSet } from '@/services/useAccountIds';
import useHistory from '@/services/useHistory';
import { isNumber } from '@/services/utils';

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

const parseAccountIds = (s: number|string|undefined): AccountIdSet => {
   if (s && !isNumber(s)) {
      const names = s.split(",");
      if (names.length > 1) {
         return names
            .map(a => parseInt(a, 10))
            .filter(a => !isNaN(a));
      } else {
         const id = parseInt(s, 10);
         if (!isNaN(id)) {
            return [id];
         }
      }
   }

   // what if the user provides an invalid string ?
   return s as AccountIdSet;
}

// A custom hook that builds on useLocation to parse
// the query string for you.
const useSearch = (defaults?: QueryDefaults): Selection => {
   const r = Object.fromEntries(new URLSearchParams(useLocation().search));
   const { mostRecent, pushAccount } = useHistory();
   const accountIds = (
      parseAccountIds(r.accounts ?? defaults?.accountIds ?? mostRecent)
   );

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
