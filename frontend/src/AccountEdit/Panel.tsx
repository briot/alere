import * as React from 'react';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import AccountEdit, { AccountEditProps } from '@/AccountEdit/View';
import useSearch from '@/services/useSearch';

export interface AccountEditPanelProps
   extends PanelBaseProps, AccountEditProps {
   type: 'accountedit';
}

const AccountEditPanel: React.FC<PanelProps<AccountEditPanelProps>> = p => {
   const query = useSearch({
      accountIds: p.props.accountId,  // default
   });

   return (
      <Panel
         {...p}
         header={{ name: 'edit account' }}
         Settings={
            null
            /*
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
            */
         }
      >
         <AccountEdit
            {...p.props}
            accountId={query.accounts.accounts[0]?.id ?? -1}
         />
      </Panel>
   );
}
export const registerAccountEdit = {'accountedit': AccountEditPanel};

