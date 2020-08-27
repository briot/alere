import * as React from 'react';
import { Link } from 'react-router-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import useAccounts, { Account, AccountId } from 'services/useAccounts';
import { Checkbox } from 'Form';
import "./Account.css";

interface MultiAccountSelectProps {
   text: string;
   value: Account[] | undefined;
   onChange: (ids: Account[] | undefined) => void;
   showStock?: boolean;
}
export const SelectMultiAccount: React.FC<MultiAccountSelectProps> = p => {
   const { accounts } = useAccounts();
   const tree = accounts.accountTree();

   const filteredTree = React.useMemo(
      () =>
         p.showStock
         ? tree
         : tree.filter(a => !a.account.isStock()),
      [tree, p.showStock]
   );

   const getKey = (index: number) => filteredTree[index].account.id;
   const getRow = (q: ListChildComponentProps) => {
      const r = filteredTree[q.index];
      const localChange = (checked: boolean) => {
         const cp = p.value
            ? [...p.value]
            : tree.map(a => a.account);
         if (checked) {
            if (!cp.includes(r.account)) {
               if (cp.length === tree.length - 1) {
                  p.onChange(undefined);  // shortcut for all accounts
               } else {
                  p.onChange([...cp, r.account]);
               }
            }
         } else {
            cp.splice(cp.indexOf(r.account), 1);
            p.onChange(cp);
         }
      };

      return (
         <Checkbox
            style={{ ...q.style, marginLeft: r.level * 20 }}
            text={r.account.name}
            checked={!p.value || p.value.includes(r.account)}
            onChange={localChange}
         />
      )
   };

   return (
      <div className="multiAccountSelect">
         {
            p.text &&
            <label htmlFor={p.text}>{p.text}: </label>
         }
         <AutoSizer>
            {
               ({ width, height }) => (
                  <FixedSizeList
                     width={width}
                     height={height}
                     itemCount={filteredTree.length}
                     itemSize={25}
                     itemKey={getKey}
                  >
                     {getRow}
                  </FixedSizeList>
               )
            }
         </AutoSizer>
      </div>
   );
}

interface AccountProps {
   id: AccountId;
   account: Account|undefined;
   noLinkIf?: Account[]|undefined;
}
const AccountName: React.FC<AccountProps> = p => {
   const name = p.account ? p.account.name : `account ${p.id}`;
   return (
      <span
         title={name}
         className={`account ${p.account?.closed ? 'closed' : ''}`}
      >
         {
            p.noLinkIf === undefined
            || p.account === undefined
            || !p.noLinkIf.includes(p.account)
            ? (<Link to={`/ledger/${p.id}`}>{name}</Link>)
            : name
         }
      </span>
   );
}
export default AccountName;
