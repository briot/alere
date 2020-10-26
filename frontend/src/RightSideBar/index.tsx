import React from 'react';
import AccountName from 'Account';
import useHistory from 'services/useHistory';
import useAccounts from 'services/useAccounts';
import RoundButton from 'RoundButton';
import Dashboard from 'Dashboard';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import './RightSideBar.css';

export interface HistoryProps {
}
const History: React.FC<HistoryProps> = p => {
   const { hist } = useHistory();
   const { accounts } = useAccounts();
   return (
      <div>
         {
            hist.map(h =>
               <RoundButton
                  img="/boursorama.svg"
                  key={h.accountId}
                  size="tiny"
               >
                  <AccountName
                     id={h.accountId}
                     account={accounts.getAccount(h.accountId)}
                  />
               </RoundButton>
            )
         }
      </div>
   );
}

export interface HistoryPanelProps extends PanelBaseProps, HistoryProps {
   type: 'history';
}
const HistoryPanel: React.FC<PanelProps<HistoryPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{title: "Recent accounts"}}
      >
         <History {...p.props} />
      </Panel>
   );
}
export const registerHistory = () => PANELS['history'] = HistoryPanel;


registerHistory();


const defaultPanels = [
   {
      type: 'history',
      colspan: 1,
      rowspan: 1,
   } as HistoryPanelProps
];



interface RightSideBarProps {
}

const RightSideBar: React.FC<RightSideBarProps> = p => {
   const doNothing = React.useCallback(() => {}, []);
   return (
      <div id='rsidebar'>
         <Dashboard
             name="rightside"
             defaultPanels={defaultPanels}
             setHeader={doNothing}
         />
      </div>
   );
}

         /*
         <h3>Favorite accounts</h3>
         <AccountSummary
            name="Socgen commun"
            amount={2300.12}
            logoUrl="/societe-generale.png"
         />
         <AccountSummary
            name="Boursorama commun"
            amount={3300.12}
            logoUrl="/boursorama.svg"
         />
         <AccountSummary
            name="Banque Postale"
            amount={-300.12}
            logoUrl="/banque-postale.svg"
         />
         */

export default RightSideBar;
