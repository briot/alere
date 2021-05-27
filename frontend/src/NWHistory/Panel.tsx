import * as React from 'react';
import NetworthHistory, { NetworthHistoryProps } from '@/NWHistory/View';
import Settings from './Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
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

   return (
      <Panel
         {...p}
         header={{name: 'networth history', range: p.props.range }}
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

export const registerNetworthHistory = {'nwhist': NetworthHistoryPanel};
