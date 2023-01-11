import * as React from 'react';
import usePost from '@/services/usePost';
import { useQueryClient } from '@tanstack/react-query';
import useFetch from '@/services/useFetch';

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
   price_scale: number;
   is_currency: boolean;
}
export const nullCommodity: Commodity = {
   id: -1,
   symbol_before: "???",
   symbol_after: "???",
   name: "???",
   price_scale: 1,
   is_currency: false,
};

interface InstitutionJSON {
   id: InstitutionId;
   name: string;
   icon: string;
}

export enum AccountKindCategory {
   EXPENSE = 0,
   INCOME = 1,
   EQUITY = 2,
   LIABILITY = 4,
   ASSET = 3,
}

interface AccountKindJSON {
   id: AccountKindId;
   name: string;
   positive: string;
   negative: string;
   category: AccountKindCategory;
   is_work_income: boolean;
   is_passive_income: boolean;
   is_unrealized: boolean;
   is_networth: boolean;
   is_stock: boolean;
   is_income_tax: boolean;
   is_misc_tax: boolean;
   is_trading: boolean;
}
const nullAccountKind: AccountKindJSON = {
   id: "",
   name: "",
   positive: "",
   negative: "",
   category: AccountKindCategory.EXPENSE,
   is_work_income: false,
   is_passive_income: false,
   is_unrealized: false,
   is_networth: false,
   is_stock: false,
   is_income_tax: false,
   is_misc_tax: false,
   is_trading: false,
}

export const is_liquid = (k: AccountKindJSON|undefined) =>
   k?.category !== AccountKindCategory.ASSET;
export const is_networth = (k: AccountKindJSON|undefined) =>
   k?.category === AccountKindCategory.EQUITY
   || k?.category === AccountKindCategory.LIABILITY
   || k?.category === AccountKindCategory.ASSET;
export const is_expense_income = (k: AccountKindJSON|undefined) =>
   k?.category === AccountKindCategory.EXPENSE
   || k?.category === AccountKindCategory.INCOME;
export const is_expense = (k: AccountKindJSON|undefined) =>
   k?.category === AccountKindCategory.EXPENSE;
export const is_income = (k: AccountKindJSON|undefined) =>
   k?.category === AccountKindCategory.INCOME;
export const is_realized_income = (k: AccountKindJSON|undefined) =>
   k?.category === AccountKindCategory.INCOME
   && !k?.is_unrealized;
export const is_unrealized_income = (k: AccountKindJSON|undefined) =>
   k?.category === AccountKindCategory.INCOME
   && k?.is_unrealized;
export const is_misc_income = (k: AccountKindJSON|undefined) =>
   k?.category === AccountKindCategory.INCOME
   && !k.is_unrealized
   && !k.is_work_income
   && !k.is_passive_income;

interface AccountJSON {
   id: AccountId;
   name: string;
   description: string;
   account_num: string;
   favorite: boolean;
   commodity_id: CommodityId;
   commodity_scu: number;
   kind_id: AccountKindId;
   closed: boolean;
   iban: string;
   parent_id: AccountId | undefined;
   opening_date: string;
   last_reconciled: string;
   institution_id: InstitutionId | undefined;
}
const nullAccountJSON: AccountJSON = {
   id: -1,
   name: "",
   description: "",
   account_num: "",
   favorite: false,
   commodity_id: nullCommodity.id,
   commodity_scu: 1,
   kind_id: nullAccountKind.id,
   closed: true,
   iban: "",
   parent_id: undefined,
   last_reconciled: "",
   opening_date: "",
   institution_id: undefined,
}

type ServerJSON = {
   accounts: AccountJSON[],
   commodities: Commodity[],
   kinds: AccountKindJSON[],
   institutions: InstitutionJSON[],
};

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
   readonly opening_date: string;
   readonly parent_id: AccountId | undefined;
   readonly description: string;
   readonly account_num: string;
   parentAccount: Account | undefined;
   private institution: InstitutionJSON | undefined;

   constructor(
      d: AccountJSON,
      list: AccountList,
   ) {
      this.id = Number(d.id);
      this.name = d.name;
      this.favorite = d.favorite;
      this.commodity = list.allCommodities[d.commodity_id] ?? nullCommodity;
      this.commodity_scu = d.commodity_scu
      this.kind = list.allAccountKinds[d.kind_id] ?? nullAccountKind;
      this.closed = d.closed;
      this.iban = d.iban;
      this.lastReconciled = d.last_reconciled;
      this.opening_date = d.opening_date;
      this.parent_id = d.parent_id;
      this.description = d.description;
      this.account_num = d.account_num;
      this.institution = d.institution_id === undefined
         ? undefined : list.allInstitutions[d.institution_id];
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

   getJSON(): AccountJSON {
      return {
         id: this.id,
         name: this.name,
         description: this.description,
         account_num: this.account_num,
         favorite: this.favorite,
         commodity_id: this.commodity.id,
         commodity_scu: this.commodity_scu,
         kind_id: this.kind.id,
         closed: this.closed,
         iban: this.iban,
         parent_id: this.parent_id,
         opening_date: this.opening_date,
         last_reconciled: this.lastReconciled,
         institution_id: this.getInstitution()?.id,
      };
   }
}


export class AccountList {
   private accounts: Map<AccountId, Account>;
   readonly allCommodities: {[id: number /*CommodityId*/]: Commodity};
   readonly allAccountKinds: {[id: string /*AccountKindId*/]: AccountKindJSON};
   readonly allInstitutions: {[id: string /*InstitutionId*/]: InstitutionJSON};

   constructor(json: ServerJSON, public loaded: boolean) {
      this.allCommodities = {};
      json.commodities.forEach(c => this.allCommodities[c.id] = c);

      this.allAccountKinds = {};
      json.kinds.forEach(c => this.allAccountKinds[c.id] = c);

      this.allInstitutions = {};
      json.institutions.forEach(c => this.allInstitutions[c.id] = c);

      this.accounts = new Map();
      json.accounts.forEach(a =>
         this.accounts.set(Number(a.id), this.buildAccount(a)));
      this.accounts.forEach(a =>
         a.parentAccount = a.parent_id === undefined
            ? undefined
            : this.accounts.get(a.parent_id)
      );
   }

   /**
    * Whether there is any networth account (bank, assets,..). This is always
    * true until we have indeed loaded the list of accounts from the server
    */
   has_accounts() {
      return !this.loaded
         || this.allAccounts().filter(a => a.kind.is_networth).length !== 0;
   }

   /**
    * Build a new Account
    */
   buildAccount(a: AccountJSON): Account {
      return new Account(a, this);
   }

   allAccounts(): Account[] {
      return Array.from(this.accounts.values());
   }

   getAccount(id: AccountId): Account {
      return this.accounts.get(id) || this.buildAccount({
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
}

const noContext: IAccountsContext = {
   accounts: new AccountList(
      {
         accounts: [],
         commodities: [],
         kinds: [],
         institutions: [],
      },
      false /* loaded */
   ),
}


const AccountsContext = React.createContext(noContext);

/**
 * Provide a addOrEdit function used to save accounts in the database.
 * A new account is created if no id is set for the parameter, otherwise an
 * existing account is modified.
 * This hook provides both the mutator function, as well as booleans to
 * indicate the current status of the transaction. On success, the list of
 * accounts is automatically fully reloaded from the server.
 */
export const useAddOrEditAccount = () => {
   const queries = useQueryClient();
   const mutation = usePost<void, AccountJSON>({
      cmd: 'account/edit',

      // On success, invalidate all caches, since the kind of accounts might
      // impact a lot of queries, for instance.
      onSuccess: () => queries.invalidateQueries(),
   });
   return mutation;
}

interface AccountsProviderProps {
   children?: React.ReactNode;
}

const parse = (json: ServerJSON): IAccountsContext => ({
   accounts: new AccountList(json, true /* loaded */),
});

export const AccountsProvider = (p: AccountsProviderProps) => {
   const { data } = useFetch({cmd: 'fetch_accounts', parse });
   return (
      <AccountsContext.Provider value={data ?? noContext}>
         {p.children}
      </AccountsContext.Provider>
   );
}

const useAccounts = () => React.useContext(AccountsContext);
export default useAccounts;
