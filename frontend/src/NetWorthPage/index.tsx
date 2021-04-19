import * as React from 'react';
import { SetHeader } from 'Header';
import Dashboard from 'Dashboard';
import { NetworthPanelProps } from 'NetWorth/Panel';
import { TreeMode } from 'services/useAccountTree';

const defaultPanels = [
   {
      type: 'networth',
      rowspan: 1,
      colspan: 4,
      hidePanelHeader: false,
      showValue: true,
      showShares: false,
      showPrice: false,
      roundValues: false,
      showDeltaLast: true,
      threshold: 1e-6,
      dates: ["1 year ago", "1 month ago", "today"],
      treeMode: TreeMode.USER_DEFINED,
   } as NetworthPanelProps,
];

const NetworthPage: React.FC<SetHeader> = p => {
   return (
      <Dashboard
         name="Networth"
         className="main"
         defaultPanels={defaultPanels}
         setHeader={p.setHeader}
      />
   );
}

export default NetworthPage;
