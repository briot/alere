export type AccountId = string|number;
export type TransactionId = string;

export interface Split {
   account: AccountId;
   reconcile?: string;
   amount: number;
   currency?: string;
   notes?: string;
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
   notes?: string;
}

/**
 * Return the first split that applies to the given account
 */
export const firstSplitForAccount = (t: Transaction, account: AccountId) =>
    t.splits.filter(s => s.account === account)[0];

/**
 * Compute what the transaction amount is, for the given account.
 * This is the sum of the splits that apply to this account.
 */
export const amountForAccount = (t: Transaction, account: AccountId) =>
    t.splits.reduce(
       (acc, s) => s.account === account ? acc + s.amount : acc,
       0
    );
