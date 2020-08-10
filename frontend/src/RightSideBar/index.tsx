import React from 'react';
import Account from 'Account';
import useHistory from 'services/useHistory';
import RoundButton from 'RoundButton';
import './RightSideBar.css';

interface RightSideBarProps {
}

const RightSideBar: React.FC<RightSideBarProps> = p => {
   const { hist } = useHistory();

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
                  <Account id={h.accountId} />
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
