import * as React from 'react';
import { SetHeader } from 'Header';
import Dashboard from 'Dashboard';
import { NetworthPanelProps } from 'NetWorth/Panel';
import { TreeMode } from 'services/useAccountTree';

const defaultPanels = [
   {
      type: 'networth',
      showValue: true,
      showDeltaLast: true,
      alternateColors: true,
      dates: ["3 months ago", "2 months ago", "1 month ago", "today"],
      treeMode: TreeMode.USER_DEFINED,
      rowspan: 4,
      colspan: 4,
   } as NetworthPanelProps,
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
