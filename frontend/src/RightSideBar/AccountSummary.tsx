import React from 'react';
import Numeric from 'Numeric';
import RoundButton from 'RoundButton';
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
            <RoundButton img={p.logoUrl} text={p.name} />
         </div>
         <div className="content">
            <Numeric amount={p.amount} />
         </div>
      </div>
   );
}

export default AccountSummary;
