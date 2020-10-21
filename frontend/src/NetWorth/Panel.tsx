import * as React from 'react';
import Networth, { NetworthProps } from 'NetWorth/View';
import Settings from 'NetWorth/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';

export interface NetworthPanelProps extends PanelBaseProps, NetworthProps {
   type: 'networth';
}

const NetworthPanel: React.FC<PanelProps<NetworthPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ title: 'Net worth' }}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Networth {...p.props} />
      </Panel>
   );
}

export const registerNetworth = () => PANELS['networth'] = NetworthPanel;
