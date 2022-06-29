import * as React from 'react';
import Metrics, { MetricsProps } from '@/Metrics/View';
import Settings from '@/Metrics/Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';

export interface MetricsPanelProps extends PanelBaseProps, MetricsProps {
   type: 'metrics';
}

const MetricsPanel: React.FC<PanelProps<MetricsPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ name: 'metrics', range: p.props.range }}
         Settings={() =>
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Metrics {...p.props} />
      </Panel>
   );
}

const registerMetrics = {'metrics': MetricsPanel};
export default registerMetrics;
