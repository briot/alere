import * as React from 'react';
import useAccounts, { Account, AccountId } from 'services/useAccounts';

/**
 * A user selects accounts for a panel either from an explicit list of
 * account ids, or via a set of named collections of accounts. This package
 * translate from these collections back to a list of ids.
 * Although we could mostly let the backend take care of that internally, we
 * need the ids in the ledger to know what Splits to show.
 */

export type AccountIdSet =
   AccountId[]    // explicit list of ids
   | string       // from a URL, comma-separated list of ids
   | 'all'
   | 'assets';

export interface AccountList {
   accounts: Account[];
   title: string;   //  Describes the list of accounts, for humans
}

const useAccountIds = (ids: AccountIdSet): AccountList => {
   const { accounts } = useAccounts();

   return React.useMemo(
      () => {
         if (ids === 'all') {
            return { accounts: accounts.allAccounts(), title: 'All accounts' };
         }

         if (ids === 'assets') {
            return {
               accounts: accounts.allAccounts().filter(a => a.kind.is_asset),
               title: 'All assets',
            };
         }

         const numids = typeof(ids) === 'string'
            ? ids.split(',').map(c => parseInt(c))
            : ids;

         const acc = numids.map(a => accounts.getAccount(a))
               .filter(a => a !== undefined);

         return {
            accounts: acc,
            title: acc.length === 1 ? acc[0]?.name : 'Multiple accounts',
         }
      },
      [ids, accounts]
   );
}
export default useAccountIds;
