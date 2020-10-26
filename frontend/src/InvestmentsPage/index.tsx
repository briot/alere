import * as React from 'react';
import { InvestmentsPanelProps } from 'Investments/Panel';
import { SetHeader } from 'Header';
import Dashboard from 'Dashboard';


const defaultPanels = [
   {
      type: 'investments',
      colspan: 4,
      rowspan: 4,
      hideIfNoShare: true,
      showWALine: false,
      showACLine: true,
   } as InvestmentsPanelProps,
];


const InvestmentPage: React.FC<SetHeader> = p => {
   return (
      <Dashboard
          name='Investments'
          className="main"
          defaultPanels={defaultPanels}
          setHeader={p.setHeader}
      />
   );
}

export default InvestmentPage;
