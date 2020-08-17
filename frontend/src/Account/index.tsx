import * as React from 'react';
import { Link } from 'react-router-dom';
import { AccountIdList, AccountId } from 'Transaction';
import useAccounts from 'services/useAccounts';
import "./Account.css";

interface AccountProps {
   id: AccountId;
   noLinkIf?: AccountIdList|undefined;
}
const Account: React.FC<AccountProps> = p => {
   const { accounts } = useAccounts();
   const acc = accounts.getAccount(p.id)!;
   const name = accounts.name(p.id);
   return (
      <span title={name} className={`account ${acc?.closed ? 'closed' : ''}`}>
         {
            p.noLinkIf === undefined || !p.noLinkIf.includes(p.id)
            ? (<Link to={`/ledger/${p.id}`}>{name}</Link>)
            : {name}
         }
      </span>
   );
}
export default Account;
