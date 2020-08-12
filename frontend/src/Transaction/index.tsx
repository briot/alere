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
 * Return the first split that applies to the given account
 */
export const firstSplitForAccount = (
   t: Transaction,
   account: AccountId|undefined,
) =>
   account === undefined
      ? t.splits.filter(s => s.amount > 0)[0]
      : t.splits.filter(s => s.account === account)[0];

/**
 * Compute what the transaction amount is, for the given account.
 * This is the sum of the splits that apply to this account.
 */
export const amountForAccount = (t: Transaction, account: AccountId|undefined) =>
   // When no account is specified, the total sum is null by construction. So
   // we only sum positive ones to get useful feedback
   account === undefined
      ? t.splits.filter(s => s.amount > 0).reduce((a, s) => a + s.amount, 0)
      : t.splits.reduce((a, s) => s.account === account ? a + s.amount : a, 0);
