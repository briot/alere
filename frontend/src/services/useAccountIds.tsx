import * as React from 'react';
import useAccounts, { Account, AccountId } from 'services/useAccounts';

/**
 * Convert a list of account ids to Account instances
 */
const useAccountsIds = (
   accountIds: AccountId[] | undefined,  // undefined for all accounts
): Account[] | undefined => {
   const { accounts } = useAccounts();
   const allAcc = React.useMemo(
      () => accountIds
         ? accountIds
            .map(a => accounts.getAccount(a))
            .filter(a => a !== undefined)
         : undefined,
      [accountIds, accounts]
   );
   const allAccounts = allAcc as Account[] | undefined;
   return allAccounts;
}
export default useAccountsIds;
