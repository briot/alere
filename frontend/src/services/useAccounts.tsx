import * as React from 'react';

export type AccountId = number;
export type AccountIdList = AccountId[] | 'all' | 'assets';
export type CommodityId = number;

export type AccountKindId = string;
// an AccountFlag, though it should be treated as opaque

interface CommodityJSON {
   id: CommodityId;
   symb: string;
   prefixed: boolean;
   qty_scale: number;
}
const nullCommodity: CommodityJSON = {
   id: -1,
   symb: "???",
   prefixed: false,
   qty_scale: 1,
};

interface AccountKindJSON {
   id: AccountKindId;
   name: string;
   positive: string;
   negative: string;
   is_stock: boolean;
   is_asset: boolean;
   is_income_expense: boolean;
}
const nullAccountKind: AccountKindJSON = {
   id: "",
   name: "",
   positive: "",
   negative: "",
   is_stock: false,
   is_asset: false,
   is_income_expense: false,
}

interface AccountJSON {
   id: AccountId;
   name: string;
   favorite: boolean;
   commodityId: CommodityId;
   kindId: AccountKindId;
   closed: boolean;
   iban: string;
   parent: AccountId | undefined;
   lastReconciled: string;
   priceScale: number;
   institution: string | null;
}
const nullAccountJSON: AccountJSON = {
   id: -1,
   name: "",
   favorite: false,
   commodityId: nullCommodity.id,
   kindId: nullAccountKind.id,
   closed: true,
   iban: "",
   parent: undefined,
   lastReconciled: "",
   priceScale: 1,
   institution: null,
}

export class Account {
   readonly id: AccountId;
   readonly name: string;
   readonly favorite: boolean;
   readonly commodity: CommodityJSON;
   readonly kind: AccountKindJSON;
   readonly closed: boolean;
   readonly iban: string;
   readonly lastReconciled: string;
   readonly priceScale: number;
   readonly parentId: AccountId | undefined;
   parentAccount: Account | undefined;
   private institution: string | null;

   static allCommodities: { [id: number /*CommodityId*/]: CommodityJSON } = {};
   static allAccountKinds: { [id: string /*AccountKindId*/]: AccountKindJSON } = {};

   constructor(d: AccountJSON) {
      this.id = Number(d.id);
      this.name = d.name;
      this.favorite = d.favorite;
      this.commodity = Account.allCommodities[d.commodityId] ?? nullCommodity;
      this.kind = Account.allAccountKinds[d.kindId] ?? nullAccountKind;
      this.closed = d.closed;
      this.iban = d.iban;
      this.lastReconciled = d.lastReconciled;
      this.priceScale = d.priceScale;
      this.parentId = d.parent;
      this.institution = d.institution;
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
      const acc: [AccountJSON[], CommodityJSON[], AccountKindJSON[]] =
         await resp.json();

      Account.allCommodities = {};
      acc[1].forEach(c => Account.allCommodities[c.id] = c);

      Account.allAccountKinds = {}
      acc[2].forEach(c => Account.allAccountKinds[c.id] = c);

      return new AccountList(acc[0]);
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
         ...nullAccountJSON,
         name: id.toString(),
      });
   }

   accountsFromCurrency(commodityId: CommodityId): Account[] {
      return Array.from(this.accounts.values()).filter(
         a => a.commodity.id === commodityId);
   }

   numAccounts(): number {
      return this.accounts.size;
   }

   name(id: AccountId): string {
      return this.getAccount(id).fullName();
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
