import * as React from 'react';
import { SetHeaderProps } from 'Dashboard/Panel';
import { BaseProps } from 'Dashboard/Module';
import { InvestmentsModuleProps } from 'Investment/Module';
import DashboardFromName from 'Dashboard';

const defaultInvestmentPanels: BaseProps[] = [
   {
      type: 'investments',
      borders: false,
      rowspan: 1,
      colspan: 4,
   } as InvestmentsModuleProps,
];

interface InvestmentPageProps {
}

const InvestmentPage: React.FC<InvestmentPageProps & SetHeaderProps> = p => {
   return (
      <DashboardFromName
          name='Investments'
          defaultPanels={defaultInvestmentPanels}
          setHeader={p.setHeader}
      />
   );
}

export default InvestmentPage;
