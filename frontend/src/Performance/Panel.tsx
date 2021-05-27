import * as React from 'react';
import Performance, { PerformanceProps } from '@/Performance/View';
import Settings from '@/Performance/Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';

export interface PerformancePanelProps extends PanelBaseProps, PerformanceProps {
   type: 'performance';
}

const PerformancePanel: React.FC<PanelProps<PerformancePanelProps>> = p => {
   return (
      <Panel
         {...p}
         className='astable'
         header={{name: 'performance', range: p.props.range}}
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

export const registerPerformance = {'performance': PerformancePanel};
