import { AccountList } from 'services/useAccounts';

export type AccountId = string|number;
export type TransactionId = string;

export interface Split {
   account: AccountId;
   reconcile?: string;
   amount: number;
   currency?: string;
   memo?: string;
   checknum?: string;
}

export interface Transaction {
   id: TransactionId;
   date: string;
   payee?: string;
   balance: number;  // balance after the transaction
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
export const splitsForAccount = (t: Transaction, account: AccountId) =>
   t.splits.filter(s => s.account === account);

/**
 * Compute what the transaction amount is, for the given account.
 * This is the sum of the splits that apply to this account.
 */
export const amountForAccount = (t: Transaction, account: AccountId) =>
   // When no account is specified, the total sum is null by construction. So
   // we only sum positive ones to get useful feedback
   splitsForAccount(t, account).reduce((a, s) => a + s.amount, 0);
