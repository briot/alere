import * as React from 'react';
import { SetHeader } from '@/Header';
import Dashboard from '@/Dashboard';
import { AccountsPanelProps } from '@/Accounts/Panel';

const defaultPanels = [
   {
      type: 'accounts',
      rowspan: 4,
      colspan: 4,
   } as AccountsPanelProps,
];


const AccountsPage: React.FC<{} & SetHeader> = p => {
   return (
      <Dashboard
         name="accounts"
         className="main"
         defaultPanels={defaultPanels}
         setHeader={p.setHeader}
      />
   );
}
export default AccountsPage;
