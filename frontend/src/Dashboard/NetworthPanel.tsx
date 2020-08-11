import * as React from 'react';
import Networth, { NetworthProps } from 'NetWorth';
import { BaseProps, DashboardPanelProps } from 'Dashboard/Panels';
import Panel from 'Panel';

export interface NetworthPanelProps extends BaseProps, NetworthProps {
}

const NetworthPanel: React.FC<DashboardPanelProps<NetworthPanelProps>> = p => {
   return (
      <Panel
         cols={p.data.colspan}
         rows={p.data.rowspan}
         header="Net Worth"
      >
         <Networth {...p.data} />
      </Panel>
   );
}
export default NetworthPanel;
