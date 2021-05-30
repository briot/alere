import * as React from 'react';
import { useHistory as useRouterHistory } from 'react-router-dom';
import { Account } from '@/services/useAccounts';
import { SelectAccount } from '@/Account';
import useQuery from '@/services/useQuery';

export const LedgerPageTitle: React.FC<{}> = () => {
   const query = useQuery();
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
