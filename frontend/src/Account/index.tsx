import * as React from 'react';
import { Link } from 'react-router-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import useAccounts, {
   Account, AccountId, AccountIdList } from 'services/useAccounts';
import { Checkbox, Select, Option } from 'Form';
import "./Account.css";

interface SelectAccountProps {
   text?: string;
   accountId: AccountId;
   onChange?: (account: Account) => void;
   hideArrow?: boolean;
   style?: React.CSSProperties;
}
export const SelectAccount: React.FC<SelectAccountProps> = p => {
   const { onChange } = p;
   const { accounts } = useAccounts();
   const tree = accounts.accountTree();
   const localChange = React.useCallback(
      (val: AccountId) => {
         const a = accounts.getAccount(val);
         if (a) {
            onChange?.(a);
         }
      },
      [onChange, accounts]
   );

   const items: Option<AccountId>[] = []
   tree.forEach(r => {
      if (r.level === 0 && items.length > 0) {
         items.push({value: 'divider'});
      }
      items.push({
         value: r.account.id,
         text: r.account.name,
         style: {paddingLeft: 20 * r.level}
      });
   });

   return (
      <Select
         onChange={localChange}
         text={p.text}
         value={p.accountId}
         hideArrow={p.hideArrow}
         style={p.style}
         options={items}
      />
   );
}

interface MultiAccountSelectProps {
   text: string;
   value: Account[] | undefined;

   //  ??? Can we return an AccountIdList, including "assets", "all",...
   onChange: (ids: AccountIdList) => void;
   showStock?: boolean;
}
export const SelectMultiAccount: React.FC<MultiAccountSelectProps> = p => {
   const ROW_HEIGHT = 25;
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
            ? p.value.map(a => a.id)
            : tree.map(a => a.account.id);
         if (checked) {
            if (!cp.includes(r.account.id)) {
               if (cp.length === tree.length - 1) {
                  p.onChange('all');
               } else {
                  p.onChange([...cp, r.account.id]);
               }
            }
         } else {
            cp.splice(cp.indexOf(r.account.id), 1);
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
      <div
         className="multiAccountSelect"
         style={{height: 15 * ROW_HEIGHT}}
      >
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
                     itemSize={ROW_HEIGHT}
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
