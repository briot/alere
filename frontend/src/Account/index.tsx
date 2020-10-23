import * as React from 'react';
import { Link } from 'react-router-dom';
import useAccounts, { Account, AccountId } from 'services/useAccounts';
import { AccountIdSet } from 'services/useAccountIds';
import useAccountTree, { TreeNode } from 'services/useAccountTree';
import { Checkbox, Select, Option } from 'Form';
import ListWithColumns, { AlternateRows, Column } from 'List/ListWithColumns';
import useListFromAccount from 'List/ListAccounts';
import List from 'List';
import "./Account.css";


interface SelectTreeNode {
   account: Account | undefined;
   name: string;
}

const createDummyParent = (account: Account|undefined, name: string) =>
   ({ account, name });

interface SelectAccountProps {
   text?: string;  // label
   account: Account;
   onChange?: (account: Account) => void;
   hideArrow?: boolean;
   style?: React.CSSProperties;
}
export const SelectAccount: React.FC<SelectAccountProps> = p => {
   const { onChange } = p;
   const { accounts } = useAccounts();

   const tree = useAccountTree<SelectTreeNode>(
      accounts.allAccounts().map(account => ({ account, name: '' })),
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
   const addItem = (r: TreeNode<SelectTreeNode>, depth: number) => {
      if (depth === 0 && items.length > 0) {
         items.push({value: 'divider'});
      }
      items.push({
         value: r.data.account?.id ?? -1,
         text: r.data.account?.name ?? r.data.name,
         style: {paddingLeft: 20 * depth}
      });
      r.children.forEach(c => addItem(c, depth + 1));
   };

   tree.forEach(r => addItem(r, 0));

   return (
      <Select
         onChange={localChange}
         text={p.text}
         value={p.account.id}
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
   onChange: (ids: AccountIdSet) => void;
   showStock?: boolean;
}
export const SelectMultiAccount: React.FC<MultiAccountSelectProps> = p => {
   const { accounts } = useAccounts();
   const filteredTree = useAccountTree<SelectTreeNode>(
      accounts.allAccounts()
         .filter(a => p.showStock || !a.kind.is_stock)
         .map(account => ({ account, name: '' })),
      createDummyParent,
   );

   const rows = useListFromAccount(filteredTree);

   const localChange = (node: SelectTreeNode, checked: boolean) => {
      const cp = p.value
         ? p.value.map(a => a.id)
         : filteredTree.map(a => a.data.account?.id || -1);
      if (!node.account) {
      } else if (checked) {
         if (!cp.includes(node.account.id)) {
            if (cp.length === filteredTree.length - 1) {
               p.onChange('all');
            } else {
               p.onChange([...cp, node.account.id]);
            }
         }
      } else {
         cp.splice(cp.indexOf(node.account.id), 1);
         p.onChange(cp);
      }
   };

   const columnAccountName: Column<SelectTreeNode> = {
      id: 'Account',
      cell: (n: SelectTreeNode) => {
         return n.account ? (
            <Checkbox
               text={n.account.name}
               checked={!p.value || p.value.includes(n.account)}
               onChange={(checked: boolean) => localChange(n, checked)
               }
            />
         ) : (
            n.name
         )
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
