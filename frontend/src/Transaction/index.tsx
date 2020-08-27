import { Account, AccountId } from 'services/useAccounts';

export type TransactionId = string;

export interface Split {
   accountId: AccountId;
   reconcile?: string;
   amount: number;
   shares?: number;  //  for stock accounts
   payee?: string;
   currency?: string;
   memo?: string;
   checknum?: string;

   account: Account|undefined;   // not sent via JSON
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
export const incomeExpenseSplits = (t: Transaction) =>
   t.splits.filter(s => s.account?.isIncomeExpense());

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
export const amountForAccounts = (t: Transaction, accounts: Account[]) =>
   // When no account is specified, the total sum is null by construction. So
   // we only sum positive ones to get useful feedback
   splitsForAccounts(t, accounts).reduce((a, s) => a + s.amount, 0);

export const sharesForAccounts = (t: Transaction, accounts: Account[]) =>
   splitsForAccounts(t, accounts)
   .reduce((a, s) => s.shares ? a + s.shares : a, 0);
