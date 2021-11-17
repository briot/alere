import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { DateRange, parseRange } from '@/Dates';
import { AccountId } from '@/services/useAccounts';
import useAccountIds, {
   AccountIdSet, AccountList } from '@/services/useAccountIds';
import useHistory from '@/services/useHistory';

export interface Selection {
   accounts: AccountList;
   range: DateRange | undefined;
   raw: Record<string, string>;
   accountId: AccountId | undefined;
   accountIds: AccountIdSet | undefined;
   date: Date;  //  a reference date (in general: today)
}

interface QueryDefaults {
   accountIds?: AccountIdSet;
   accountId?: AccountId,
   range?: DateRange;
}

// A custom hook that builds on useLocation to parse
// the query string for you.
const useSearch = (defaults?: QueryDefaults): Selection => {
   const r = Object.fromEntries(new URLSearchParams(useLocation().search));
   const { mostRecent, pushAccount } = useHistory();
   const accountIds = r.accounts ?? defaults?.accountIds ?? mostRecent;
   const accounts = useAccountIds(accountIds);
   const accountId =
      r.accountId !== undefined
      ? parseInt(r.accountId, 10)
      : defaults?.accountId ?? mostRecent;

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
      accountId,
      date: r.date ? new Date(r.date) : new Date(),
      range: parseRange(r.range) ?? defaults?.range,
   };
};

export default useSearch;
