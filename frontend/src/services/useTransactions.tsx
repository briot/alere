import * as React from 'react';
import useAccounts, { Account } from 'services/useAccounts';
import { DateRange, rangeToHttp } from 'Dates';
import { Transaction, incomeExpenseSplits } from 'Transaction';

/**
 * Fetch a ledger from the server
 */

const useTransactions = (
   accountList: Account[],
   range?: DateRange|undefined,   // undefined, to see forever
   precomputed?: Transaction[],   // use this if set, instead of fetching
): Transaction[] => {
   const { accounts } = useAccounts();
   const [baseTrans, setBaseTrans] = React.useState<Transaction[]>([]);
   const idsForQuery = accountList.map(a => a.id).sort().join(',');
   const queryKeepIE = accountList.length > 1;

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/ledger/${idsForQuery}?${rangeToHttp(range)}`
            );
            const data: Transaction[] = await resp.json();
            setBaseTrans(data);
         }
         if (precomputed) {
            setBaseTrans(precomputed);
         } else if (idsForQuery) {
            dofetch();
         } else {
            setBaseTrans([]);
         }
      },
      [idsForQuery, range, precomputed]
   );

   const transactions: Transaction[] = React.useMemo(
      () => {
         let trans = [...baseTrans]
         trans.forEach(t =>
            t.splits.forEach(s =>
               s.account = accounts.getAccount(s.accountId)
            )
         );

         if (queryKeepIE) {
            // remove internal transfers
            trans = trans.filter(t => incomeExpenseSplits(t).length > 0);
         }

         return trans;
      },
      [accounts, baseTrans, queryKeepIE]
   );

   return transactions;
}

export default useTransactions;
