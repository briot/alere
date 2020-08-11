import * as React from 'react';
import Networth, { NetworthProps } from 'NetWorth';
import { BaseProps, DashboardPanelProps } from 'Dashboard/Panels';
import Panel from 'Panel';

export interface NetworthPanelProps extends BaseProps, NetworthProps {
   type: 'networth';
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

export const getNetworthPanel = (
   d: BaseProps, s: (p: Partial<BaseProps>)=>void
) => {
   return d.type === "networth"
      ? <NetworthPanel data={d as NetworthPanelProps} setData={s} />
      : null;
}

