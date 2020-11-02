import React from 'react';
import Recent, { RecentProps } from './View';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';

export interface RecentPanelProps extends PanelBaseProps, RecentProps {
   type: 'recent';
}
const RecentPanel: React.FC<PanelProps<RecentPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{name: "Recent accounts"}}
      >
         <Recent {...p.props} />
      </Panel>
   );
}
export const registerRecent = () => PANELS['recent'] = RecentPanel;
