import * as React from 'react';

export type AccountId = string|number;
export type AccountIdList = AccountId[] | 'all' | 'assets';

interface AccountJSON {
   id: AccountId;
   name: string;
   favorite: boolean;
   currencyId: string;
   currencySymbol: string;
   accountType: string;
   closed: boolean;
   iban: string;
   parent: AccountId | undefined;
   lastReconciled: string;
   forOpeningBalances: boolean;
   pricePrecision: number;
   sharesPrecision: number;
}

export class Account {
   readonly id: AccountId;
   readonly name: string;
   readonly favorite: boolean;
   readonly currencyId: string;
   readonly currencySymbol: string;
   readonly closed: boolean;
   readonly iban: string;
   readonly lastReconciled: string;
   readonly forOpeningBalances: boolean;
   readonly pricePrecision: number;
   readonly sharesPrecision: number;
   readonly parentId: AccountId | undefined;
   parentAccount: Account | undefined;
   accountType: string;

   constructor(d: AccountJSON) {
      this.id = d.id;
      this.name = d.name;
      this.favorite = d.favorite;
      this.currencyId = d.currencyId;
      this.currencySymbol = d.currencySymbol;
      this.accountType = d.accountType;
      this.closed = d.closed;
      this.iban = d.iban;
      this.lastReconciled = d.lastReconciled;
      this.forOpeningBalances = d.forOpeningBalances;
      this.pricePrecision = d.pricePrecision;
      this.sharesPrecision = d.sharesPrecision;
      this.parentId = d.parent;
   }

   isStock(): boolean {
      return this.accountType === "Stock";
   }

   isIncomeExpense(): boolean {
      return this.accountType === "Income" || this.accountType === "Expense";
   }

   isAsset(): boolean {
      return this.accountType === "Asset"
         || this.accountType === "Stock"
         || this.accountType === "Investment"
         || this.accountType === "Savings"
         || this.accountType === "Checking";
   }

   /**
    * Fully qualified name of the account
    */
   fullName(): string {
      // skip the top-level accounts ('Asset', 'Income',...)
      const pname = this.parentAccount && this.parentAccount.parentAccount
         ? this.parentAccount.fullName()
         : undefined;
      return pname ? `${pname}:${this.name}` : this.name;
   }

   setParent(parent: Account|undefined) {
      this.parentAccount = parent;
   }
}


export class AccountList {
   private accounts: Map<AccountId, Account>;

   static async fetch() {
      const resp = await window.fetch('/api/account/list');
      const acc: AccountJSON[] = await resp.json();
      return new AccountList(acc);
   }

   constructor(acc: AccountJSON[]) {
      this.accounts = new Map();
      acc.forEach(a => this.accounts.set(a.id, new Account(a)));
      this.accounts.forEach(a =>
         a.parentAccount = a.parentId === undefined
            ? undefined
            : this.accounts.get(a.parentId)
      );
   }

   allAccounts(): Account[] {
      return Array.from(this.accounts.values());
   }

   getAccount(id: AccountId): Account {
      return this.accounts.get(id) || new Account({
         id,
         name: id.toString(),
         favorite: false,
         currencyId: 'unknown',
         currencySymbol: 'unknown',
         accountType: 'unknown',
         closed: false,
         iban: '',
         parent: undefined,
         lastReconciled: '',
         forOpeningBalances: false,
         pricePrecision: 0,
         sharesPrecision: 0,
      });
   }

   accountsFromCurrency(currencyId: string): Account[] {
      return Array.from(this.accounts.values()).filter(
         a => a.currencyId === currencyId);
   }

   numAccounts(): number {
      return this.accounts.size;
   }

   name(id: AccountId): string {
      const acc = this.getAccount(id);
      return acc ? acc.fullName() : `account ${id}`;
   }
}

/**
 * Sort accounts alphabetically
 */
export const cmpAccounts = (a : Account|undefined, b: Account|undefined) => {
   return a
      ? b ? a.name.localeCompare(b.name) : 1
      : -1;
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
