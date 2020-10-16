import * as React from 'react';
import { RelativeDate } from 'Dates';
import useBalance, { Balance, BalanceList } from 'services/useBalance';
import useAccounts, { Account, cmpAccounts } from 'services/useAccounts';

export interface BalanceWithAccount extends Balance {
   account: Account|undefined;
}

/**
 * Similar to useBalance, but hide accounts for which the value is below a
 * given threshold for all the requested dates. This will typically hide
 * closed accounts, but is a better filter in case the account was closed but
 * still had some worth.
 */

const useBalanceWithThreshold = (p: {
   currencyId: string;
   dates: RelativeDate[];
   threshold?: number;
}): {baseData: BalanceList, data: BalanceWithAccount[]} => {
   const baseData = useBalance({...p});
   const { accounts } = useAccounts();
   const thresh = p.threshold ?? 1e-10;
   const data = React.useMemo(
      () => baseData.list

            // Remove lines below the threshold
            .filter(n =>
               n.atDate.find(a =>
                  (Math.abs(a.shares * a.price) >= thresh)) !== undefined)

            // Lookup accounts
            .map(n => ({...n, account: accounts.getAccount(n.accountId) }))

            // Sort alphabetically
            .sort((a, b) => cmpAccounts(a.account, b.account)),
      [accounts, baseData, thresh]
   );

   return {baseData, data};
};

export default useBalanceWithThreshold;
