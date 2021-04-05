import * as React from 'react';
import { rangeDisplay } from 'Dates';
import Performance, { PerformanceProps } from 'Performance/View';
import Settings from 'Performance/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';

export interface PerformancePanelProps extends PanelBaseProps, PerformanceProps {
   type: 'performance';
}

const PerformancePanel: React.FC<PanelProps<PerformancePanelProps>> = p => {
   const r = rangeDisplay(p.props.range);
   return (
      <Panel
         {...p}
         className='astable'
         header={{
            name: `Performance (${r.possessive} period)`,
         }}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Performance {...p.props} />
      </Panel>
   );
}

export const registerPerformance =
   () => PANELS['performance'] = PerformancePanel;
