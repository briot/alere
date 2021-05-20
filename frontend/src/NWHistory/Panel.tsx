import * as React from 'react';
import NetworthHistory, { NetworthHistoryProps } from '@/NWHistory/View';
import Settings from './Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from '@/Dashboard/Panel';
import { rangeDisplay } from '@/Dates';
import { capitalize } from '@/services/utils';
import useAccounts from '@/services/useAccounts';

export interface NetworthHistoryPanelProps
extends PanelBaseProps, NetworthHistoryProps {
   type: 'nwhist';
}

const NetworthHistoryPanel: React.FC<PanelProps<NetworthHistoryPanelProps>> = p => {
   const { accounts } = useAccounts();
   if (!accounts.has_accounts()) {
      return null;
   }

   const r = rangeDisplay(p.props.range);
   return (
      <Panel
         {...p}
         header={{name: capitalize(`${r.possessive}networth history`),
                  tooltip: r.as_dates}}
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
