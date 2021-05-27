import * as React from 'react';
import Welcome, { WelcomeProps } from './View';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';

export interface WelcomePanelProps extends PanelBaseProps, WelcomeProps {
   type: 'welcome';
}

const WelcomePanel: React.FC<PanelProps<WelcomePanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{name: "Welcome"}}
      >
         <Welcome {...p.props} />
      </Panel>
   );
}

export const registerWelcome = {'welcome': WelcomePanel};
