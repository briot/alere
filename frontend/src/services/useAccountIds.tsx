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
         ? accounts.accountTree().map(n => n.account!)
         : accountIds === 'assets'
         ? accounts.accountTree().map(n => n.account!).filter(a => a.isAsset())
         : accountIds.map(a => accounts.getAccount(a))
            .filter(a => a !== undefined),
      [accountIds, accounts]
   );
   const allAccounts = allAcc as Account[] | undefined;
   return allAccounts;
}
export default useAccountIds;
