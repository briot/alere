import * as React from 'react';

export type AccountId = number;
export type AccountIdList = AccountId[] | 'all' | 'assets';

interface AccountJSON {
   id: string|number;
   name: string;
   favorite: boolean;
   currencyId: string|number;
   currencySymbol: string;
   currencyPrefixed: boolean;
   accountType: string;
   closed: boolean;
   iban: string;
   parent: AccountId | undefined;
   lastReconciled: string;
   priceScale: number;
   sharesScale: number;
   institution: string | null;
   is_stock: boolean;
   is_asset: boolean;
   is_income_expense: boolean;
}

export class Account {
   readonly id: AccountId;
   readonly name: string;
   readonly favorite: boolean;
   readonly currencyId: string|number;
   readonly currencySymbol: string;
   readonly currencyPrefixed: boolean;
   readonly closed: boolean;
   readonly iban: string;
   readonly lastReconciled: string;
   readonly priceScale: number;
   readonly sharesScale: number;
   readonly parentId: AccountId | undefined;
   readonly is_stock: boolean;
   readonly is_asset: boolean;
   readonly is_income_expense: boolean;
   readonly accountType: string;
   parentAccount: Account | undefined;
   private institution: string | null;

   constructor(d: AccountJSON) {
      this.id = Number(d.id);
      this.name = d.name;
      this.favorite = d.favorite;
      this.currencyId = d.currencyId;
      this.currencySymbol = d.currencySymbol;
      this.currencyPrefixed = d.currencyPrefixed;
      this.accountType = d.accountType;
      this.closed = d.closed;
      this.iban = d.iban;
      this.lastReconciled = d.lastReconciled;
      this.priceScale = d.priceScale;
      this.sharesScale = d.sharesScale;
      this.parentId = d.parent;
      this.institution = d.institution;
      this.is_stock = d.is_stock;
      this.is_asset = d.is_asset;
      this.is_income_expense = d.is_income_expense;
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

   getInstitution(): string {
      return (this.institution || this.parentAccount?.getInstitution())
        ?? 'Unknown';
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
      acc.forEach(a => this.accounts.set(Number(a.id), new Account(a)));
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
         currencyPrefixed: false,
         accountType: 'unknown',
         closed: false,
         iban: '',
         parent: undefined,
         lastReconciled: '',
         priceScale: 1,
         sharesScale: 1,
         institution: 'Unknown',
         is_stock: false,
         is_asset: false,
         is_income_expense: false,
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
