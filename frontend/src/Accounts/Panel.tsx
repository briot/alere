import * as React from 'react';
import Accounts, { AccountsProps } from '@/Accounts/View';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';

export interface AccountsPanelProps extends PanelBaseProps, AccountsProps {
   type: 'accounts';
}

const AccountsPanel: React.FC<PanelProps<AccountsPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ name: 'accounts' }}
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
         <Accounts {...p.props} />
      </Panel>
   );
}
export const registerAccounts = {'accounts': AccountsPanel};
