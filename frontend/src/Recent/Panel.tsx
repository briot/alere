import * as React from 'react';
import Recent, { RecentProps } from './View';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';

export interface RecentPanelProps extends PanelBaseProps, RecentProps {
   type: 'recent';
}
const RecentPanel: React.FC<PanelProps<RecentPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{name: "Recent"}}
      >
         <Recent {...p.props} />
      </Panel>
   );
}
const registerRecent = {'recent': RecentPanel};
export default registerRecent;
