/**
 * Create rows for a ListWithColumns, when those rows represent accounts.
 * Typical use is:
 *    const rows = accountsToRows(createNode);
 */

import * as React from 'react';
import { LogicalRow } from './ListWithColumns';
import { computeTree, DataWithAccount,
   TreeNode } from '@/services/useAccountTree';
import { TreeMode } from '@/services/TreeMode';
import useAccounts, { Account } from '@/services/useAccounts';

const toLogicalRows = <T extends DataWithAccount> (list: TreeNode<T>[]) =>
   list
   .map((n, idx) => ({
      key: n.data.account?.id || -idx,
      data: n.data,
      getChildren: () => toLogicalRows(n.children),
   }));

const useBuildRowsFromAccounts = <T extends DataWithAccount, SETTINGS> (
   createNode: (a: Account|undefined, fallbackName: string) => T,
   filterAccount?: (a: Account) => boolean,  // whether to include the account
   mode?: TreeMode,
): LogicalRow<T, SETTINGS>[] => {
   const { accounts } = useAccounts();
   const tree = React.useMemo(
      () => computeTree(
         accounts,
         accounts.allAccounts()
            .filter(a => !filterAccount || filterAccount(a))
            .map(a => createNode(a, '')),
         createNode,
         mode ?? TreeMode.USER_DEFINED),
      [accounts, filterAccount, createNode, mode]
   );
   const rows = React.useMemo(
      () => toLogicalRows(tree),
      [tree]
   );
   return rows;
}

export default useBuildRowsFromAccounts;
