import * as React from 'react';
import useDashboard from 'services/useDashboard';
import { SetHeader } from 'Header';
import { Dashboard } from 'Dashboard';
import { BaseProps } from 'Dashboard/Module';
import { NetworthPanelProps } from 'NetWorth/Module';
import { TreeMode } from 'services/useAccountTree';

const defaultPanels: BaseProps[] = [
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


interface AccountsPageProps {
}
const AccountsPage: React.FC<AccountsPageProps & SetHeader> = p => {
   const { setHeader } = p;
   const { panels, setPanels } = useDashboard('accounts', defaultPanels);

   React.useEffect(
      () => setHeader({ title: "Accounts" }),
      [setHeader]
   );

   return (
      <div className="main-area">
         <Dashboard
            panels={panels}
            setPanels={setPanels}
         />
      </div>
   );
}

export default AccountsPage
