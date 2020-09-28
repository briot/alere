import * as React from 'react';
import { Link } from 'react-router-dom';
import useAccounts, {
   Account, AccountId, AccountIdList } from 'services/useAccounts';
import useAccountTree from 'services/useAccountTree';
import { Checkbox, Select, Option } from 'Form';
import ListWithColumns, { AlternateRows, Column } from 'List/ListWithColumns';
import useListFromAccount from 'List/ListAccounts';
import List from 'List';
import "./Account.css";

const createDummyParent = (account: Account) => ({ account });

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

   const tree = useAccountTree(
      accounts.allAccounts().map(account => ({ account })),
      createDummyParent,
   );

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
      if (r.depth === 0 && items.length > 0) {
         items.push({value: 'divider'});
      }
      items.push({
         value: r.data.account.id,
         text: r.data.account.name,
         style: {paddingLeft: 20 * r.depth}
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
   const { accounts } = useAccounts();
   const filteredTree = useAccountTree(
      accounts.allAccounts()
         .filter(a => p.showStock || !a.isStock())
         .map(account => ({ account })),
      createDummyParent,
   );

   const rows = useListFromAccount(filteredTree);

   const localChange = (account: Account, checked: boolean) => {
      const cp = p.value
         ? p.value.map(a => a.id)
         : filteredTree.map(a => a.data.account.id);
      if (checked) {
         if (!cp.includes(account.id)) {
            if (cp.length === filteredTree.length - 1) {
               p.onChange('all');
            } else {
               p.onChange([...cp, account.id]);
            }
         }
      } else {
         cp.splice(cp.indexOf(account.id), 1);
         p.onChange(cp);
      }
   };

   const columnAccountName: Column<{ account: Account }> = {
      id: 'Account',
      cell: (account: { account: Account} ) => {
         return (
            <Checkbox
               text={account.account.name}
               checked={!p.value || p.value.includes(account.account)}
               onChange={(checked: boolean) =>
                  localChange(account.account, checked)
               }
            />
         );
      }
   };

   return (
      <div
         className="multiAccountSelect"
         style={{height: 15 * List.ROW_HEIGHT}}
      >
         {
            p.text &&
            <label htmlFor={p.text}>{p.text}: </label>
         }
         <ListWithColumns
            columns={[columnAccountName]}
            rows={rows}
            indentNested={true}
            defaultExpand={true}
            alternate={AlternateRows.ROW}
         />
      </div>
   );
}

interface AccountProps {
   id: AccountId;
   account: Account|undefined;
   fullName?: boolean;
   noLinkIf?: Account[]|undefined;
}
const AccountName: React.FC<AccountProps> = p => {
   const fname = p.account ? p.account.fullName() : `account ${p.id}`;
   const name = (!p.account || p.fullName) ? fname : p.account.name;
   return (
      <span
         title={fname}
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
