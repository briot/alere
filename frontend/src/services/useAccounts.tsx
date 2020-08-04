import * as React from 'react';
import { AccountId } from 'Transaction';

export interface Account {
   id: AccountId;
   name: string;
   favorite: boolean;
}

export class AccountList {
   private accounts: Map<AccountId, Account>;

   static async fetch() {
      const resp = await window.fetch('/api/account/list');
      const acc: Account[] = await resp.json();
      return new AccountList(acc);
   }

   constructor(acc: Account[]) {
      this.accounts = new Map();
      acc.forEach(a => this.accounts.set(a.id, a));
   }

   get_account(id: AccountId): Account|undefined {
      return this.accounts.get(id);
   }

   name(id: AccountId): string {
      return (this.get_account(id)?.name || `account ${id}`)
         .replace('Asset:', '')
         .replace('Liability:', '')
         .replace('Income:', '')
         .replace('Expense:', '')
         .replace('Equity:', '');
   }
}


interface IAccountsContext {
   accounts: AccountList;

   refresh: () => void;
   // Call refresh() to request a refresh of the list of accounts
}

const noContext: IAccountsContext = {
   accounts: new AccountList([]),
   refresh: () => {},
}

const AccountsContext = React.createContext(noContext);

export const AccountsProvider: React.FC<{}> = p => {
   const [ctx, setCtx] = React.useState<IAccountsContext>(noContext);

   const refresh = React.useCallback(
      async () => {
         const accounts = await AccountList.fetch();
         setCtx({accounts, refresh});
      },
      []
   );

   // Initial loading
   React.useEffect(
      () => {
         refresh();
      },
      [refresh]
   );

   return (
      <AccountsContext.Provider value={ctx}>
         {p.children}
      </AccountsContext.Provider>
   );
}

const useAccounts = () => React.useContext(AccountsContext);
export default useAccounts;
