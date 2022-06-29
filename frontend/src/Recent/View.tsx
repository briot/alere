import React from 'react';
import AccountName from '@/Account/AccountName';
import useHistory from '@/services/useHistory';
import useAccounts from '@/services/useAccounts';
import RoundButton from '@/RoundButton';

export interface RecentProps {
}
const Recent: React.FC<RecentProps> = p => {
   const { hist } = useHistory();
   const { accounts } = useAccounts();
   return (
      <div>
         {
            hist.map(h => {
               const a = accounts.getAccount(h.accountId);
               return a.id >= 0
                  ? (
                     <RoundButton
                        img={a.getInstitution()?.icon}
                        key={h.accountId}
                        size="tiny"
                        aspect="noborder"
                     >
                        <AccountName
                           id={h.accountId}
                           account={a}
                        />
                     </RoundButton>
                  ) : null;
            })
         }
      </div>
   );
}
export default Recent;
