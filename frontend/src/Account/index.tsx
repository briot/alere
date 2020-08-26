import * as React from 'react';
import { Link } from 'react-router-dom';
import { AccountIdList, AccountId } from 'Transaction';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import useAccounts from 'services/useAccounts';
import { Checkbox } from 'Form';
import "./Account.css";

interface MultiAccountSelectProps {
   text: string;
   value: AccountIdList | undefined;
   onChange: (ids: AccountIdList | undefined) => void;
   showStock?: boolean;
}
export const SelectMultiAccount: React.FC<MultiAccountSelectProps> = p => {
   const { accounts } = useAccounts();
   const tree = accounts.accountTree();

   const filteredTree = React.useMemo(
      () =>
         p.showStock
         ? tree
         : tree.filter(n => !accounts.isStock(n.id)),
      [accounts, tree, p.showStock]
   );

   const getKey = (index: number) => filteredTree[index].id;
   const getRow = (q: ListChildComponentProps) => {
      const r = filteredTree[q.index];
      const localChange = (checked: boolean) => {
         const cp = p.value
            ? [...p.value]
            : tree.map(n => n.id);
         if (checked) {
            if (!cp.includes(r.id)) {
               if (cp.length === tree.length - 1) {
                  p.onChange(undefined);  // shortcut for all accounts
               } else {
                  p.onChange([...cp, r.id]);
               }
            }
         } else {
            cp.splice(cp.indexOf(r.id), 1);
            p.onChange(cp);
         }
      };

      return (
         <Checkbox
            style={{ ...q.style, marginLeft: r.level * 20 }}
            text={accounts.shortName(r.id)}
            checked={!p.value || p.value.includes(r.id)}
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
            : name
         }
      </span>
   );
}
export default Account;
