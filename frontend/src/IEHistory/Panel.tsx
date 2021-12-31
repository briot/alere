import * as React from 'react';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import IEHistory, { IEHistoryProps } from '@/IEHistory/View';
import Settings from '@/IEHistory/Settings';

export interface IEHistoryPanelProps extends PanelBaseProps, IEHistoryProps {
   type: 'iehistory';
}

const IEHistoryPanel: React.FC<PanelProps<IEHistoryPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ name: 'Income/Expense History' }}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <IEHistory {...p.props} />
      </Panel>
   );
}
const registerIEHistory = {'iehistory': IEHistoryPanel};
export default registerIEHistory;
