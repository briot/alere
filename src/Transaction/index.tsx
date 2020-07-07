export interface Split {
   num?: string;
   account: string;
   reconcile?: string;
   amount: number;
   currency?: string;
   action?: string;
   notes?: string;
}

export interface Transaction {
   id: number;
   date: string;
   payee?: string;
   balance: number;  // balance after the transaction
   splits: Split[];  // at least one (there are two in the database, but here
                     // we might be seeing a partial view specific to one
                     // account only).
}

