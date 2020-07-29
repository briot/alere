import React from 'react';
import Numeric from 'Numeric';
import './AccountSummary.css';

interface AccountSummaryProps {
   name: string;
   amount: number;
   logoUrl: string;
}

const AccountSummary: React.FC<AccountSummaryProps> = p => {
   return (
      <div className="accountSummary">
         <div className="name">
            <span className="icon">
               <img src={p.logoUrl} alt="" />
            </span>
            <span>{p.name}</span>
         </div>
         <div className="content">
            <Numeric amount={p.amount} />
         </div>
      </div>
   );
}

export default AccountSummary;
