import { AccountList } from 'services/useAccounts';

export type AccountId = string|number;
export type TransactionId = string;

export type AccountIdList = AccountId[];

export interface Split {
   account: AccountId;
   reconcile?: string;
   amount: number;
   shares?: number;  //  for stock accounts
   payee?: string;
   currency?: string;
   memo?: string;
   checknum?: string;
}

export interface Transaction {
   id: TransactionId;
   date: string;
   balance: number;  // balance after the transaction
   balanceShares?: number;  //  for stock accounts
   splits: Split[];  // at least one (there are two in the database, but here
                     // we might be seeing a partial view specific to one
                     // account only).
   memo?: string;
}

/**
 * All splits involving an income or expense account
 */
export const incomeExpenseSplits = (t: Transaction, accounts: AccountList) =>
   t.splits.filter(s => accounts.isIncomeExpense(s.account));

export const amountIncomeExpense = (t: Transaction, accounts: AccountList) =>
   incomeExpenseSplits(t, accounts).reduce((a, s) => a - s.amount, 0);

/**
 * All splits related to a specific account
 */
export const splitsForAccounts = (t: Transaction, accounts: AccountIdList) =>
   t.splits.filter(s => accounts.includes(s.account));
export const splitsNotForAccounts = (t: Transaction, accounts: AccountIdList) =>
   t.splits.filter(s => !accounts.includes(s.account));

/**
 * Compute what the transaction amount is, for the given account.
 * This is the sum of the splits that apply to this account.
 */
export const amountForAccounts = (t: Transaction, accounts: AccountIdList) =>
   // When no account is specified, the total sum is null by construction. So
   // we only sum positive ones to get useful feedback
   splitsForAccounts(t, accounts).reduce((a, s) => a + s.amount, 0);

export const sharesForAccounts = (t: Transaction, accounts: AccountIdList) =>
   splitsForAccounts(t, accounts)
   .reduce((a, s) => s.shares ? a + s.shares : a, 0);
