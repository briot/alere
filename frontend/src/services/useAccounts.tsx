import * as React from 'react';

export type AccountId = string|number;

interface AccountJSON {
   id: AccountId;
   name: string;
   favorite: boolean;
   currencyId: string;
   currencySymbol: string;
   accountType: string;
   closed: boolean;
   iban: string;
   parent: AccountId;
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
   parent: Account | undefined;
   children: Account[] = [];

   private accountType: string;

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
   }

   isStock(): boolean {
      return this.accountType === "Stock";
   }

   isIncomeExpense(): boolean {
      return this.accountType === "Income" || this.accountType === "Expense";
   }

   /**
    * Fully qualified name of the account
    */
   fullName(): string {
      // skip the top-level accounts ('Asset', 'Income',...)
      const pname = this.parent && this.parent.parent
         ? this.parent.fullName()
         : undefined;
      return pname ? `${pname}:${this.name}` : this.name;
   }

   setParent(parent: Account|undefined) {
      this.parent = parent;
   }

   addChild(child: Account) {
      this.children.push(child);
   }

}


export interface AccountTreeNode {
   account: Account;
   level: number;  // 0 for root, 1 for direct children, ...
}

export class AccountList {
   private accounts: Map<AccountId, Account>;
   private tree: AccountTreeNode[];

   static async fetch() {
      const resp = await window.fetch('/api/account/list');
      const acc: AccountJSON[] = await resp.json();
      return new AccountList(acc);
   }

   constructor(acc: AccountJSON[]) {
      this.accounts = new Map();
      acc.forEach(a => this.accounts.set(a.id, new Account(a)));

      const roots: Account[] = [];
      acc.forEach(a => {
         const c = this.accounts.get(a.id)!;
         if (a.parent) {
            const p = this.accounts.get(a.parent);
            c.setParent(p);
            p?.addChild(c);
         } else {
            roots.push(c);
         }
      });

      // Sort the children accounts by alphabetical order
      const cmpAcc = (n1: Account, n2: Account) =>
         n1.name.localeCompare(n2.name);
      this.accounts.forEach(a => a.children.sort(cmpAcc));

      // Sort the root accounts by alphabetical order
      roots.sort(cmpAcc);

      // Flatten the account tree
      this.tree = [];
      const add = (account: Account, level: number) => {
         this.tree.push({ account, level });
         account.children.forEach(a => add(a, level + 1));
      }
      roots.forEach(a => add(a, 0));
   }

   getAccount(id: AccountId): Account|undefined {
      return this.accounts.get(id);
   }

   numAccounts(): number {
      return this.accounts.size;
   }

   accountTree(): AccountTreeNode[] {
      return this.tree;
   }

   name(id: AccountId): string {
      const acc = this.getAccount(id);
      return acc ? acc.fullName() : `account ${id}`;
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
