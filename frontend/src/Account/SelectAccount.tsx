import * as React from 'react';
import useAccounts, { Account, AccountId } from '@/services/useAccounts';
import useAccountTree, { TreeNode } from '@/services/useAccountTree';
import { Select, Option } from '@/Form';
import "./Account.scss";

export interface SelectTreeNode {
   account: Account | undefined;
   name: string;
}

export const createSelectAccountRow = (account: Account|undefined, name: string): SelectTreeNode =>
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
      accounts.allAccounts().map(a => createSelectAccountRow(a, '')),
      createSelectAccountRow,
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
