import * as React from 'react';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import IEHistoryBars, { IEHistoryBarsProps } from '@/IEHistoryBars/View';
import Settings from '@/IEHistoryBars/Settings';

export interface IEHistoryBarsPanelProps
   extends PanelBaseProps, IEHistoryBarsProps {
   type: 'iehistorybars';
}

const IEHistoryBarsPanel: React.FC<PanelProps<IEHistoryBarsPanelProps>> =
   React.memo(p => {
   return (
      <Panel
         {...p}
         header={{ name: 'Income/Expense History' }}
         Settings={() =>
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <IEHistoryBars {...p.props} />
      </Panel>
   );
});
const registerIEHistoryBars = {'iehistorybars': IEHistoryBarsPanel};
export default registerIEHistoryBars;
