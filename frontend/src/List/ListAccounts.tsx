import { LogicalRow } from './ListWithColumns';
import { computeTree, DataWithAccount,
   TreeNode, TreeMode } from '@/services/useAccountTree';
import { Account, AccountList } from '@/services/useAccounts';


/**
 * Create rows for a ListWithColumns, when those rows represent accounts.
 * Typical use is:
 *    const rows = accountsToRows(useAccountTree(
 *       accounts.allAccounts(),
 *       createNode,
 *       TreeMode.USER_DEFINED));
 */

const accounts_to_rows = <T extends DataWithAccount, SETTINGS> (
   accounts: AccountList,
   accountlist: Account[],
   createNode: (a: Account|undefined, fallbackName: string) => T,
   mode: TreeMode,
): LogicalRow<T, SETTINGS, unknown>[] => {

   const tree = computeTree(
      accounts,
      accountlist.map(a => createNode(a, '')),
      createNode,
      mode);

   const toLogicalRows = (list: TreeNode<T>[]) =>
      list
      .map((n, idx) => ({
         key: n.data.account?.id || -idx,
         data: n.data,
         getChildren: () => toLogicalRows(n.children),
      }));
   return toLogicalRows(tree);
}

export default accounts_to_rows;
