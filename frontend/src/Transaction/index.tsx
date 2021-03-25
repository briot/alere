import { Account, AccountId, CommodityId } from 'services/useAccounts';

export type TransactionId = string;

export interface Split {
   accountId: AccountId;
   reconcile?: string;
   date: string;     // date the split was completed
   amount: number;
   currency: CommodityId | undefined, // amount is given in that currency
   shares?: number;  //  for stock accounts, in account.commodity
   price?: number;   // in currency

   account: Account|undefined;   // not sent via JSON
}

export interface Transaction {
   id: TransactionId;
   date: string;     // date the user initiated the transaction
   balance: number;  // balance after the transaction
   balanceShares?: number;  //  for stock accounts
   splits: Split[];  // at least one (there are two in the database, but here
                     // we might be seeing a partial view specific to one
                     // account only).
   memo?: string;
   checknum?: string;
   payee?: string;   // the third party involved in the transaction
}

/**
 * All splits involving an income or expense account
 */
export const incomeExpenseSplits = (t: Transaction) =>
   t.splits.filter(s => s.account?.kind.is_income_expense);

export const amountIncomeExpense = (t: Transaction) =>
   incomeExpenseSplits(t).reduce((a, s) => a - s.amount, 0);

/**
 * All splits related to a specific account
 */
export const splitsForAccounts = (t: Transaction, accounts: Account[]) =>
   t.splits.filter(s => s.account && accounts.includes(s.account));

export const splitsNotForAccounts = (t: Transaction, accounts: Account[]) =>
   t.splits.filter(s => s.account && !accounts.includes(s.account));

/**
 * Compute what the transaction amount is, for the given account.
 * This is the sum of the splits that apply to this account.
 */
export const amountForAccounts = (t: Transaction, accounts: Account[]): number =>
   // When no account is specified, the total sum is null by construction. So
   // we only sum positive ones to get useful feedback
   splitsForAccounts(t, accounts).reduce(
      (a, s, idx) => (idx === 0 ? s.amount : a + s.amount),
      NaN);

export const sharesForAccounts = (t: Transaction, accounts: Account[]): number =>
   splitsForAccounts(t, accounts).reduce(
      (a, s, idx) => s.shares ? (idx === 0 ? s.shares : a + s.shares) : a,
      NaN);

export const priceForAccounts = (t: Transaction, accounts: Account[]): number =>
   splitsForAccounts(t, accounts).reduce(
      (a, s, idx) => s.price ? (idx === 0 ? s.price : a + s.price) : a,
      NaN);
