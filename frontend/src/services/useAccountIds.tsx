import * as React from 'react';
import useAccounts, { Account, AccountIdList } from 'services/useAccounts';

/**
 * Convert a list of account ids to Account instances
 */
const useAccountIds = (
   accountIds: AccountIdList,
): Account[] | undefined => {    //  undefined, if all accounts
   const { accounts } = useAccounts();
   const allAcc = React.useMemo(
      () =>
         accountIds === 'all'
         ? accounts.allAccounts()
         : accountIds === 'assets'
         ? accounts.allAccounts().filter(a => a.kind.is_asset)
         : accountIds.map(a => accounts.getAccount(a))
            .filter(a => a !== undefined),
      [accountIds, accounts]
   );
   const allAccounts = allAcc as Account[] | undefined;
   return allAccounts;
}
export default useAccountIds;
