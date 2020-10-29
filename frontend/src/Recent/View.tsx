import React from 'react';
import AccountName from 'Account';
import useHistory from 'services/useHistory';
import useAccounts from 'services/useAccounts';
import RoundButton from 'RoundButton';

export interface RecentProps {
}
const Recent: React.FC<RecentProps> = p => {
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
export default Recent;
