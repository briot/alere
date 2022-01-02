import * as React from 'react';
import { Account } from '@/services/useAccounts';
import { AccountIdSet } from '@/services/useAccountIds';
import { Checkbox } from '@/Form';
import ListWithColumns, { Column } from '@/List/ListWithColumns';
import { AlternateRows } from '@/List/ListPrefs';
import useBuildRowsFromAccounts from '@/List/ListAccounts';
import {
   SelectTreeNode, createSelectAccountRow } from '@/Account/SelectAccount';
import List from '@/List';
import "./Account.scss";

interface MultiAccountSelectProps {
   text: string;
   value: Account[] | undefined;

   //  ??? Can we return an AccountIdList, including "assets", "all",...
   onChange: (ids: AccountIdSet) => void;
   showStock?: boolean;
}
export const SelectMultiAccount: React.FC<MultiAccountSelectProps> = p => {
   const rows = useBuildRowsFromAccounts(
      createSelectAccountRow,
      a => p.showStock || !a.kind.is_stock,  // filter account
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
            rowColors={AlternateRows.ROW}
         />
      </div>
   );
}
