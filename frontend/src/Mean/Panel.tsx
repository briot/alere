import * as React from 'react';
import Mean, { MeanProps } from 'Mean/View';
import Settings from 'Mean/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import { rangeDisplay } from 'Dates';
import { capitalize } from 'services/utils';

export interface MeanPanelProps extends PanelBaseProps, MeanProps {
   type: 'mean';
}

const MeanPanel: React.FC<PanelProps<MeanPanelProps>> = p => {
   const r = rangeDisplay(p.props.range);
   return (
      <Panel
         {...p}
         header={{name: capitalize(
            `${r.possessive}`
            + `${p.props.expenses ? 'expense' : 'income'}`
            + ` history`),
                  title: r.as_dates}}
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
