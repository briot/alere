import * as React from 'react';
import useAccounts, {
   Account, AccountId, cmpAccounts } from 'services/useAccounts';


export interface DataWithAccount {
   account: Account;
}

export interface TreeNode <T extends DataWithAccount> {
   data: T; // undefined when we had to create a dummy parent
   children: TreeNode<T> [];
   parentNode: TreeNode<T> | undefined;
   depth: number;  // 0 for root nodes, 1 for direct children, ...
}

export enum TreeMode {
   FLAT,          // flat list of account, sorted alphabetically
   USER_DEFINED,  // use parent account set by the user
   ACCOUNT_TYPE,  // organize by account type
}


const useAccountTree = <T extends DataWithAccount> (
   p: T[],
   createDummyParent: (a: Account) => T,
   mode: TreeMode = TreeMode.USER_DEFINED,
): TreeNode<T>[] => {
   const { accounts } = useAccounts();
   const getParent: ((a: Account) => AccountId|undefined) = React.useMemo(
      () => mode === TreeMode.FLAT
         ? (a: Account) => undefined
         : mode === TreeMode.USER_DEFINED
         ? (a: Account) => a.parentId
         : (a: Account) => a.accountType,
      [mode]
   );

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
            if (n.data.account.parentId) {
               let parentId = getParent(n.data.account);
               if (parentId !== undefined) {
                  let pnode = nodes.get(parentId);

                  // Create missing parents
                  if (!pnode) {
                     pnode = {
                        data: createDummyParent(accounts.getAccount(parentId)),
                        children: [],
                        parentNode: undefined,
                        depth: 0,
                     };

                     nodes.set(parentId, pnode);
                  }

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
      [p, accounts, createDummyParent, getParent]
   );

   return roots;
}

export default useAccountTree;
