import * as React from 'react';
import useFetch from '@/services/useFetch';
import usePost from '@/services/usePost';
import { useQueryClient } from 'react-query';

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
   is_realized_income?: boolean;
   is_unrealized_income?: boolean;
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
   description: string;
   account_num: string;
   favorite: boolean;
   commodityId: CommodityId;
   commodity_scu: number;
   kindId: AccountKindId;
   closed: boolean;
   iban: string;
   parent: AccountId | undefined;
   opening_date: string;
   lastReconciled: string;
   institution: InstitutionId | undefined;
}
const nullAccountJSON: AccountJSON = {
   id: -1,
   name: "",
   description: "",
   account_num: "",
   favorite: false,
   commodityId: nullCommodity.id,
   commodity_scu: 1,
   kindId: nullAccountKind.id,
   closed: true,
   iban: "",
   parent: undefined,
   lastReconciled: "",
   opening_date: "",
   institution: undefined,
}

type ServerJSON = [
   AccountJSON[], Commodity[], AccountKindJSON[], InstitutionJSON[]
];

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
   readonly parentId: AccountId | undefined;
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
      this.commodity = list.allCommodities[d.commodityId] ?? nullCommodity;
      this.commodity_scu = d.commodity_scu
      this.kind = list.allAccountKinds[d.kindId] ?? nullAccountKind;
      this.closed = d.closed;
      this.iban = d.iban;
      this.lastReconciled = d.lastReconciled;
      this.opening_date = d.opening_date;
      this.parentId = d.parent;
      this.description = d.description;
      this.account_num = d.account_num;
      this.institution = d.institution === undefined
         ? undefined : list.allInstitutions[d.institution];
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
         commodityId: this.commodity.id,
         commodity_scu: this.commodity_scu,
         kindId: this.kind.id,
         closed: this.closed,
         iban: this.iban,
         parent: this.parentId,
         opening_date: this.opening_date,
         lastReconciled: this.lastReconciled,
         institution: this.getInstitution()?.id,
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
      json[1].forEach(c => this.allCommodities[c.id] = c);

      this.allAccountKinds = {};
      json[2].forEach(c => this.allAccountKinds[c.id] = c);

      this.allInstitutions = {};
      json[3].forEach(c => this.allInstitutions[c.id] = c);

      this.accounts = new Map();
      json[0].forEach(a =>
         this.accounts.set(Number(a.id), this.buildAccount(a)));
      this.accounts.forEach(a =>
         a.parentAccount = a.parentId === undefined
            ? undefined
            : this.accounts.get(a.parentId)
      );
   }

   /**
    * Whether there is any networth account (bank, assets,..). This is always
    * true until we have indeed loaded the list of accounts from the server
    */
   has_accounts() {
      return !this.loaded
         || this.allAccounts().filter(a => a.kind.is_asset).length !== 0;
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
   accounts: new AccountList([[], [], [], []], false /* loaded */),
}


const AccountsContext = React.createContext(noContext);

const ACCOUNT_LIST_URL = '/api/account/list';

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
      url: '/api/account/edit',

      // On success, invalidate all caches, since the kind of accounts might
      // impact a lot of queries, for instance.
      onSuccess: () => queries.invalidateQueries(),
   });
   return mutation;
}

export const AccountsProvider: React.FC<{}> = p => {
   const { data } = useFetch<IAccountsContext, ServerJSON>({
      url: ACCOUNT_LIST_URL,
      parse: (json: ServerJSON) => {
         return {
            accounts: new AccountList(json, true /* loaded */),
         };
      },
   });

   return (
      <AccountsContext.Provider value={data || noContext}>
         {p.children}
      </AccountsContext.Provider>
   );
}

const useAccounts = () => React.useContext(AccountsContext);
export default useAccounts;
