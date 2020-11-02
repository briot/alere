import * as React from 'react';
import { LogicalRow } from 'List/ListWithColumns';
import { DataWithAccount, TreeNode } from 'services/useAccountTree';


const useListFromAccount = <T extends DataWithAccount, SETTINGS> (
   tree: TreeNode<T>[],
): LogicalRow<T, SETTINGS>[] => {

   const rows = React.useMemo(
      () => {
         const toLogicalRows = (list: TreeNode<T>[]) =>
            list
            .map((n, idx) => ({
               key: n.data.account?.id || -idx,
               data: n.data,
               getChildren: () => toLogicalRows(n.children),
            }));
         return toLogicalRows(tree);
      },
      [tree]
   );
   return rows;
}

export default useListFromAccount;
