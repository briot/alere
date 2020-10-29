import React from 'react';
import Dashboard from 'Dashboard';
import { RecentPanelProps } from 'Recent/Panel';
import { NetworthPanelProps } from 'NetWorth/Panel';
import { TreeMode } from 'services/useAccountTree';
import './RightSideBar.css';

const defaultPanels = [
   {
      type: 'recent',
      colspan: 1,
      rowspan: 1,
   } as RecentPanelProps,
   {
      type: 'networth',
      rowspan: 1,
      colspan: 1,
      showValue: false,
      showShares: false,
      showPrice: false,
      threshold: 1e-6,
      dates: ["today"],
      treeMode: TreeMode.USER_DEFINED,
   } as NetworthPanelProps,

   /* ??? favorite accounts */
];

interface RightSideBarProps {
}

const RightSideBar: React.FC<RightSideBarProps> = p => {
   const doNothing = React.useCallback(() => {}, []);
   return (
      <div id='rsidebar'>
         <Dashboard
             name="rightside"
             defaultPanels={defaultPanels}
             setHeader={doNothing}
         />
      </div>
   );
}
export default RightSideBar;
