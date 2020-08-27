import React from 'react';
import AccountName from 'Account';
import useHistory from 'services/useHistory';
import RoundButton from 'RoundButton';
import useAccounts from 'services/useAccounts';
import './RightSideBar.css';

interface RightSideBarProps {
}

const RightSideBar: React.FC<RightSideBarProps> = p => {
   const { hist } = useHistory();
   const { accounts } = useAccounts();

   return (
      <div id='rsidebar'>
         <h3>Recent accounts</h3>

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

         {/*
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
         */ }
      </div>
   );
}

export default RightSideBar;
