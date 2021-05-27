import React from 'react';
import Dashboard from '@/Dashboard';
import { PanelBaseProps } from '@/Dashboard/Panel';
import useSettings from '@/services/useSettings';
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
   const { val, setVal } = useSettings<PanelBaseProps[]>(
      'Right', defaultPanels);

   return (
      <div id='rsidebar'>
         <Dashboard
             name="rightside"
             panels={val}
             savePanels={setVal}
             setHeader={doNothing}
         />
      </div>
   );
}
export default RightSideBar;
