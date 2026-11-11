import { AccountId, AccountList } from '@/services/useAccounts';

export const defaultLedgerAccountId = (
   accounts: AccountList,
   mostRecent: AccountId | undefined,
): AccountId | undefined => {
   const all = accounts.allAccounts();
   const recent = all.find(account => account.id === mostRecent);
   if (recent) {
      return recent.id;
   }

   const parentIds = new Set(
      all.flatMap(account => account.parentId === undefined
         ? [] : [account.parentId]),
   );
   const leaves = all.filter(
      account => !account.closed && !parentIds.has(account.id),
   );
   return leaves.find(account => account.kind.is_networth)?.id
      ?? leaves[0]?.id
      ?? all[0]?.id;
};
