import * as React from 'react';
import { AccountId } from 'Transaction';

export interface Account {
   id: AccountId;
   name: string;
   favorite: boolean;
   currencyId: string;
   accountType: string;
   closed: boolean;
   iban: string;
   parent: AccountId;
   lastReconciled: string;
   forOpeningBalances: boolean;
}

export class AccountList {
   private accounts: Map<AccountId, Account>;

   static async fetch() {
      const resp = await window.fetch('/api/account/list');
      const acc: Account[] = await resp.json();
      window.console.log(acc);  // MANU
      return new AccountList(acc);
   }

   constructor(acc: Account[]) {
      this.accounts = new Map();
      acc.forEach(a => this.accounts.set(a.id, a));
   }

   getAccount(id: AccountId): Account|undefined {
      return this.accounts.get(id);
   }

   currencyId(id: AccountId): string {
      return this.getAccount(id)?.currencyId || '';
   }

   isIncomeExpense(id: AccountId): boolean {
      const ty = this.getAccount(id)?.accountType;
      return ty === "Income" || ty === "Expense";
   }

   fullName(acc: Account): string {
      const parent = acc.parent ? this.getAccount(acc.parent) : undefined;

      // skip the top-level accounts ('Asset', 'Income',...)
      const pname = parent && parent.parent? this.fullName(parent) : undefined;

      return pname ? `${pname}:${acc.name}` : acc.name;
   }

   name(id: AccountId): string {
      const acc = this.getAccount(id);
      return acc ? this.fullName(acc) : `account ${id}`;
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
