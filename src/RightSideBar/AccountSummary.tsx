import React from 'react';
import Numeric from 'Numeric';
import './AccountSummary.css';

interface AccountSummaryProps {
   name: string;
   amount: number;
}

const AccountSummary: React.FC<AccountSummaryProps> = p => {
   return (
      <div className="accountSummary">
         <div className="title">{p.name}</div>
         <div className="content">
            <Numeric amount={p.amount} />
         </div>
      </div>
   );
}

export default AccountSummary;
