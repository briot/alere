import * as React from 'react';
import NetworthHistory, { NetworthHistoryProps } from 'NWHistory/View';
import Settings from './Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import { rangeDisplay } from 'Dates';
import { capitalize } from 'services/utils';

export interface NetworthHistoryPanelProps
extends PanelBaseProps, NetworthHistoryProps {
   type: 'nwhist';
}

const NetworthHistoryPanel: React.FC<PanelProps<NetworthHistoryPanelProps>> = p => {
   const r = rangeDisplay(p.props.range);
   return (
      <Panel
         {...p}
         header={{name: capitalize(`${r.possessive}networth history`),
                  title: r.as_dates}}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <NetworthHistory {...p.props} />
      </Panel>
   );
}

export const registerNetworthHistory =
   () => PANELS['nwhist'] = NetworthHistoryPanel;
