import * as React from 'react';
import { PerformancePanelProps } from '@/Performance/Panel';
import { SetHeader } from '@/Header';
import Dashboard from '@/Dashboard';


const defaultPanels = [
   {
      type: 'performance',
      colspan: 4,
      rowspan: 4,
      hideIfNoShare: true,
      range: "1 year",
   } as PerformancePanelProps,
];


const PerformancePage: React.FC<SetHeader> = p => {
   return (
      <Dashboard
          name='Performance'
          className="main"
          defaultPanels={defaultPanels}
          setHeader={p.setHeader}
      />
   );
}

export default PerformancePage;
