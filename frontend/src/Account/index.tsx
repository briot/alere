import * as React from 'react';
import { Link } from 'react-router-dom';
import useAccounts, { Account, AccountId } from '@/services/useAccounts';
import { AccountIdSet } from '@/services/useAccountIds';
import useAccountTree, { TreeMode, TreeNode } from '@/services/useAccountTree';
import { Checkbox, Select, Option } from '@/Form';
import ListWithColumns, { AlternateRows, Column } from '@/List/ListWithColumns';
import accounts_to_rows from '@/List/ListAccounts';
import { DateRange } from '@/Dates';
import List from '@/List';
import Tooltip from '@/Tooltip';
import "./Account.scss";

interface SelectTreeNode {
   account: Account | undefined;
   name: string;
}

const createRow = (account: Account|undefined, name: string): SelectTreeNode =>
   ({ account, name });

interface SelectAccountProps {
   text?: string;  // label
   account: Account|undefined;
   onChange?: (account: Account) => void;
   hideArrow?: boolean;
   style?: React.CSSProperties;
   format?: (value: Account) => string;  //  formatting the selected
}
export const SelectAccount: React.FC<SelectAccountProps> = p => {
   const { format, onChange } = p;
   const { accounts } = useAccounts();

   const formatAccount = React.useCallback(
      (a: AccountId) => format?.(accounts.getAccount(a)),
      [format, accounts],
   );

   const tree = useAccountTree<SelectTreeNode>(
      accounts.allAccounts().map(a => createRow(a, '')),
      createRow,
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
         value={p.account?.id ?? -1}
         hideArrow={p.hideArrow}
         style={p.style}
         options={items}
         format={formatAccount}
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

   const rows = React.useMemo(
      () => accounts_to_rows(
         accounts,
         accounts.allAccounts().filter(a => p.showStock || !a.kind.is_stock),
         createRow,
         TreeMode.USER_DEFINED),
      [accounts, p.showStock]
   );

   const localChange = (node: SelectTreeNode, checked: boolean) => {
      const cp = p.value
         ? p.value.map(a => a.id)
         : rows.map(a => a.data.account?.id || -1);
      if (!node.account) {
      } else if (checked) {
         if (!cp.includes(node.account.id)) {
            if (cp.length === rows.length - 1) {
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

   const columnAccountName: Column<SelectTreeNode, unknown > = {
      id: 'Account',
      cell: (n: SelectTreeNode) => {
         return n.account ? (
            <Checkbox
               text={n.account.name}
               value={!p.value || p.value.includes(n.account)}
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
            settings={{}}
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
