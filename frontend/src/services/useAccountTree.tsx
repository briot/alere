import * as React from 'react';
import { Account, AccountId, cmpAccounts } from 'services/useAccounts';


export interface DataWithAccount {
   account: Account;
}

export interface TreeNode <T extends DataWithAccount> {
   data: T;
   children: TreeNode<T> [];
   parentNode: TreeNode<T> | undefined;
   depth: number;  // 0 for root nodes, 1 for direct children, ...
}

const useAccountTree = <T extends DataWithAccount> (
   p: T[],
): TreeNode<T>[] => {
   const roots: TreeNode<T>[] = React.useMemo(
      () => {
         // Create one node per account in the list
         const nodes: Map<AccountId, TreeNode<T>> = new Map();
         p.forEach(a => {
            nodes.set(
               a.account.id,
               {
                  data: a,
                  children: [],
                  parentNode: undefined,
                  depth: 0,
               }
            );
         });

         // Reorganize those nodes into a tree
         nodes.forEach(n => {
            if (n.data.account.parentId !== undefined) {
               const pnode = nodes.get(n.data.account.parentId);
               if (pnode) {
                  pnode.children.push(n);
                  n.parentNode = pnode;
               }
            }
         });

         // Sort children alphabetically
         const cmpNode = (left: TreeNode<T>, right: TreeNode<T>) =>
            cmpAccounts(left.data.account, right.data.account);
         nodes.forEach(n => n.children.sort(cmpNode));

         // Sort root nodes alphabetically
         const roots = Array.from(nodes.values())
            .filter(n => n.parentNode === undefined);
         roots.sort(cmpNode);
         return roots;
      },
      [p]
   );

   return roots;
}

export default useAccountTree;
