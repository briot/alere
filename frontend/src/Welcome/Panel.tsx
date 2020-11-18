import * as React from 'react';
import Welcome, { WelcomeProps } from './View';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import useAccounts from 'services/useAccounts';

export interface WelcomePanelProps extends PanelBaseProps, WelcomeProps {
   type: 'welcome';
}

const WelcomePanel: React.FC<PanelProps<WelcomePanelProps>> = p => {
   const { accounts } = useAccounts();
   if (accounts.has_accounts()) {
      return null;
   }

   return (
      <Panel
         {...p}
         header={{name: "Welcome"}}
      >
         <Welcome {...p.props} />
      </Panel>
   );
}

export const registerWelcome = () => PANELS['welcome'] = WelcomePanel;
