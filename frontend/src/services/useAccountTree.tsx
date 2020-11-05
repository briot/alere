import * as React from 'react';
import useAccounts, {
   Account, AccountId, cmpAccounts } from 'services/useAccounts';


export interface DataWithAccount {
   account: Account|undefined;
}

export interface TreeNode <T extends DataWithAccount> {
   data: T; // undefined when we had to create a dummy parent
   children: TreeNode<T> [];
   parentNode: TreeNode<T> | undefined;
}

export enum TreeMode {
   FLAT,          // Flat list of account, sorted alphabetically
   USER_DEFINED,  // Use parent account set by the user
   ACCOUNT_TYPE,  // Organize by account type
   INSTITUTION,   // By institution
}


const useAccountTree = <T extends DataWithAccount> (
   p: T[],
   createDummyParent: (a: Account|undefined, name: string) => T,
   mode: TreeMode = TreeMode.USER_DEFINED,
): TreeNode<T>[] => {
   const { accounts } = useAccounts();
   const getParent: ((a: Account) => AccountId|string|undefined) = React.useMemo(
      () => mode === TreeMode.FLAT
         ? (a: Account) => undefined
         : mode === TreeMode.USER_DEFINED
         ? (a: Account) => a.parentId
         : mode === TreeMode.INSTITUTION
         ? (a: Account) => a.getInstitution()?.name ?? 'Unknown'
         : (a: Account) => a.kind.name,
      [mode]
   );

   const roots: TreeNode<T>[] = React.useMemo(
      () => {
         // Create one node per account in the list
         const nodes: Map<AccountId|string, TreeNode<T>> = new Map();
         p.forEach(a => {
            if (a.account) {
               nodes.set(
                  a.account.id,
                  {
                     data: a,
                     children: [],
                     parentNode: undefined,
                  }
               );
            }
         });

         // Reorganize those nodes into a tree
         nodes.forEach(n => {
            if (n.data.account) {
               let parentId = getParent(n.data.account);
               if (parentId) {
                  let pnode = nodes.get(parentId);

                  // Create missing parents
                  if (!pnode) {
                     if (mode === TreeMode.USER_DEFINED) {
                        pnode = {
                           data: createDummyParent(
                              accounts.getAccount(parentId as AccountId),
                              '',
                           ),
                           children: [],
                           parentNode: undefined,
                        };
                     } else {
                        pnode = {
                           data: createDummyParent(
                              undefined,
                              parentId as string,
                           ),
                           children: [],
                           parentNode: undefined,
                        };
                     }

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
      [p, accounts, createDummyParent, getParent, mode]
   );

   return roots;
}

export default useAccountTree;
