import React from 'react';
import Dashboard from '@/Dashboard';
import { RecentPanelProps } from '@/Recent/Panel';
import './RightSideBar.scss';

const defaultPanels = [
   {
      type: 'recent',
      colspan: 1,
      rowspan: 1,
   } as RecentPanelProps,

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
