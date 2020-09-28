import * as React from 'react';
import { LogicalRow } from 'List/ListWithColumns';
import { DataWithAccount, TreeNode } from 'services/useAccountTree';


const useListFromAccount = <T extends DataWithAccount> (
   tree: TreeNode<T>[],
): LogicalRow<T>[] => {

   const rows = React.useMemo(
      () => {
         const toLogicalRows = (list: TreeNode<T>[]) =>
            list
            .map(n => ({
               key: n.data.account.id,
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
