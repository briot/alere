export interface Split {
   num?: string;
   account: string;
   reconcile?: string;
   amount: number;
   currency?: string;
}

export interface Transaction {
   id: number;
   date: string;
   payee?: string;
   balance: number;  // balance after the transaction
   splits: Split[];  // at least one (there are two in the database, but here
                     // we might be seeing a partial view specific to one
                     // account only).
   notes?: string;
}

/**
 * Compute what the transaction amount is, for the given account.
 * This is the sum of the splits that apply to this account.
 */
export const amountForAccount = (t: Transaction, account: string) =>
    t.splits.reduce(
       (acc, curr) => curr.account === account ? acc + curr.amount : acc,
       0
    );
