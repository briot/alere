import * as React from 'react';
import { useHistory as useRouterHistory } from 'react-router-dom';
import { Account } from '@/services/useAccounts';
import { SelectAccount } from '@/Account/SelectAccount';
import useSearch from '@/services/useSearch';
import useAccounts from '@/services/useAccounts';
import useHistory from '@/services/useHistory';
import { defaultLedgerAccountId } from '@/Ledger/accountSelection';

export const LedgerPageTitle: React.FC<{}> = () => {
   const { accounts } = useAccounts();
   const { mostRecent } = useHistory();
   const defaultAccountId = defaultLedgerAccountId(accounts, mostRecent);
   const query = useSearch({
      accountIds: defaultAccountId === undefined
         ? undefined : [defaultAccountId],
   });
   const history = useRouterHistory();
   const onAccountChange = React.useCallback(
      (a: Account) => history.push(`/ledger?accounts=${a.id}`),
      [history]
   );

   return query.accounts.accounts.length === 1
      ? (
         <SelectAccount
            account={query.accounts.accounts[0]}
            onChange={onAccountChange}
            hideArrow={false}
            format={a => a.fullName()}
         />
      ) : (
         <span>{query.accounts.title}</span>
      );
}
