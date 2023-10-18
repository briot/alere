import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Account } from '@/services/useAccounts';
import { SelectAccount } from '@/Account/SelectAccount';
import useSearch from '@/services/useSearch';

const LedgerPageTitle: React.FC<{}> = () => {
   const query = useSearch();
   const navigate = useNavigate();
   const onAccountChange = React.useCallback(
      (a: Account) => navigate(`/ledger?accounts=${a.id}`),
      [navigate]
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
export default LedgerPageTitle;
