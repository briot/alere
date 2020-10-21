import * as React from 'react';
import Mean, { MeanProps } from 'Mean/View';
import Settings from 'Mean/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import { rangeDisplay } from 'Dates';

export interface MeanPanelProps extends PanelBaseProps, MeanProps {
   type: 'mean';
}

const MeanPanel: React.FC<PanelProps<MeanPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ title: `${p.props.expenses ? 'Expenses' : 'Income'}`
                           + ` history ${rangeDisplay(p.props.range)}`}}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Mean {...p.props} />
      </Panel>
   );
}

export const registerMean = () => PANELS['mean'] = MeanPanel;
