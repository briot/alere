import * as React from 'react';

export type AccountId = number;
export type CommodityId = number;
export type InstitutionId = number;

export type AccountKindId = string;
// an AccountFlag, though it should be treated as opaque

export interface Commodity {
   id: CommodityId;
   name: string;
   symbol_before: string;
   symbol_after: string;
   qty_scale: number;
   is_currency: boolean;
}
const nullCommodity: Commodity = {
   id: -1,
   symbol_before: "???",
   symbol_after: "???",
   name: "???",
   qty_scale: 1,
   is_currency: false,
};

interface InstitutionJSON {
   id: InstitutionId;
   name: string;
   icon: string;
}

interface AccountKindJSON {
   id: AccountKindId;
   name: string;
   positive: string;
   negative: string;
   is_stock?: boolean;
   is_asset?: boolean;
   is_income_expense?: boolean;
   is_work_income?: boolean;
   is_passive_income?: boolean;
   is_expense?: boolean;
   is_income_tax?: boolean;
   is_other_tax?: boolean;
}
const nullAccountKind: AccountKindJSON = {
   id: "",
   name: "",
   positive: "",
   negative: "",
}

interface AccountJSON {
   id: AccountId;
   name: string;
   favorite: boolean;
   commodityId: CommodityId;
   commodity_scu: number;
   kindId: AccountKindId;
   closed: boolean;
   iban: string;
   parent: AccountId | undefined;
   lastReconciled: string;
   institution: InstitutionId | undefined;
}
const nullAccountJSON: AccountJSON = {
   id: -1,
   name: "",
   favorite: false,
   commodityId: nullCommodity.id,
   commodity_scu: 1,
   kindId: nullAccountKind.id,
   closed: true,
   iban: "",
   parent: undefined,
   lastReconciled: "",
   institution: undefined,
}

export class Account {
   readonly id: AccountId;
   readonly name: string;
   readonly favorite: boolean;
   readonly commodity: Commodity;
   readonly commodity_scu: number;
   readonly kind: AccountKindJSON;
   readonly closed: boolean;
   readonly iban: string;
   readonly lastReconciled: string;
   readonly parentId: AccountId | undefined;
   parentAccount: Account | undefined;
   private institution: InstitutionJSON | undefined;

   constructor(
      d: AccountJSON,
      allCommodities: { [id: number /*CommodityId*/]: Commodity},
      allAccountKinds: { [id: string /*AccountKindId*/]: AccountKindJSON },
      allInstitutions: { [id: string /*InstitutionId*/]: InstitutionJSON },
   ) {
      this.id = Number(d.id);
      this.name = d.name;
      this.favorite = d.favorite;
      this.commodity = allCommodities[d.commodityId] ?? nullCommodity;
      this.commodity_scu = d.commodity_scu
      this.kind = allAccountKinds[d.kindId] ?? nullAccountKind;
      this.closed = d.closed;
      this.iban = d.iban;
      this.lastReconciled = d.lastReconciled;
      this.parentId = d.parent;
      this.institution = d.institution === undefined
         ? undefined : allInstitutions[d.institution];
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

   getInstitution(): InstitutionJSON|undefined {
      return (this.institution ?? this.parentAccount?.getInstitution());
   }
}


export class AccountList {
   private accounts: Map<AccountId, Account>;
   allCommodities: { [id: number /*CommodityId*/]: Commodity};
   allAccountKinds: { [id: string /*AccountKindId*/]: AccountKindJSON };
   allInstitutions: { [id: string /* InstitutionId */]: InstitutionJSON };

   static async fetch() {
      const resp = await window.fetch('/api/account/list');
      const acc: [AccountJSON[], Commodity[],
                  AccountKindJSON[], InstitutionJSON[]] =
         await resp.json();

      const comm: { [id: number /*CommodityId*/]: Commodity} = {};
      acc[1].forEach(c => comm[c.id] = c);

      const kinds: { [id: string /*AccountKindId*/]: AccountKindJSON } = {};
      acc[2].forEach(c => kinds[c.id] = c);

      const inst: { [id: string /*InstitutionId*/]: InstitutionJSON } = {};
      acc[3].forEach(c => inst[c.id] = c);

      return new AccountList(acc[0], comm, kinds, inst);
   }

   constructor(
      acc: AccountJSON[],
      allCommodities: { [id: number /*CommodityId*/]: Commodity},
      allAccountKinds: { [id: string /*AccountKindId*/]: AccountKindJSON },
      allInstitutions: { [id: string /* InstitutionId */]: InstitutionJSON },
   ) {
      this.allCommodities = allCommodities;
      this.allAccountKinds = allAccountKinds;
      this.allInstitutions = allInstitutions;

      this.accounts = new Map();
      acc.forEach(a => this.accounts.set(
         Number(a.id),
         new Account(a, allCommodities, allAccountKinds, allInstitutions)));
      this.accounts.forEach(a =>
         a.parentAccount = a.parentId === undefined
            ? undefined
            : this.accounts.get(a.parentId)
      );
   }

   /**
    * Whether there is any networth account (bank, assets,..)
    */
   has_accounts() {
      return this.allAccounts().filter(a => a.kind.is_asset).length !== 0;
   }

   allAccounts(): Account[] {
      return Array.from(this.accounts.values());
   }

   getAccount(id: AccountId): Account {
      return this.accounts.get(id) || new Account({
         ...nullAccountJSON,
         name: id.toString(),
      }, this.allCommodities, this.allAccountKinds, this.allInstitutions);
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
   commodities: { [id: number /*CommodityId*/]: Commodity};

   refresh: () => void;
   // Call refresh() to request a refresh of the list of accounts
}

const noContext: IAccountsContext = {
   accounts: new AccountList([], {}, {}, {}),
   commodities: {},
   refresh: () => {},
}

const AccountsContext = React.createContext(noContext);

export const AccountsProvider: React.FC<{}> = p => {
   const [ctx, setCtx] = React.useState<IAccountsContext>(noContext);

   const refresh = React.useCallback(
      async () => {
         const accounts = await AccountList.fetch();
         setCtx({accounts,
                 commodities: accounts.allCommodities,
                 refresh});
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
