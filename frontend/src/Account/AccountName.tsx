import * as React from 'react';
import { Link } from 'react-router-dom';
import { Account, AccountId } from '@/services/useAccounts';
import { DateRange } from '@/Dates';
import Tooltip from '@/Tooltip';
import "./Account.scss";

interface AccountProps {
   id: AccountId;
   account: Account|undefined;
   fullName?: boolean;
   noLinkIf?: Account[]|undefined;
   range?: DateRange; // included in link to ledger
}
const AccountName: React.FC<AccountProps> = p => {
   const fname = p.account?.fullName() ?? `account ${p.id}`;
   const name = (!p.account || p.fullName) ? fname : p.account.name;
   return (
      <Tooltip
          tooltip={`${fname} ${p.account?.description ?? ''}`}
      >
         <span className={`account ${p.account?.closed ? 'closed' : ''}`} >
            {
               p.noLinkIf === undefined
               || p.account === undefined
               || !p.noLinkIf.includes(p.account)
               ? (<Link to={`/ledger?accounts=${p.id}&range=${p.range}`}>{name}</Link>)
               : name
            }
         </span>
      </Tooltip>
   );
}
export default AccountName;
