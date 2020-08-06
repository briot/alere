import React from 'react';
import AccountSummary from './AccountSummary';
import './RightSideBar.css';

interface RightSideBarProps {
}

const RightSideBar: React.FC<RightSideBarProps> = p => {
   return (
      <div id='rsidebar'>
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
      </div>
   );
}

export default RightSideBar;
