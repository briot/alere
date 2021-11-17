import * as React from 'react';
import useAccounts, { AccountId } from '@/services/useAccounts';
import SelectAccountKind from '@/Account/SelectAccountKinds';
// import AccountName from '@/Account';
// import accounts_to_rows from '@/List/ListAccounts';
// import { TreeMode } from '@/services/useAccountTree';
// import ListWithColumns, { Column, LogicalRow } from '@/List/ListWithColumns';
// import SelectAccountKind from '@/Account/SelectAccountKinds';
import { Input } from '@/Form';


/**
 * Properties for the view
 */
export interface AccountEditProps {
   accountId: AccountId;
}

const AccountEdit: React.FC<AccountEditProps> = p => {
   const { accounts } = useAccounts();
   const account = accounts.getAccount(p.accountId);

   return (
      <div>
         <div>
            <span>Name</span>
            <span>
               <Input value={account.name} />
            </span>
         </div>
         <div>
            <span>Type</span>
            <span>
               <SelectAccountKind value={account.kind.id} />
            </span>
         </div>
         <div>
            <span>Institution</span>
            <span>
               <Input value={account.getInstitution()?.name ?? ''} />
            </span>
         </div>

      </div>
   );
}
export default AccountEdit;
