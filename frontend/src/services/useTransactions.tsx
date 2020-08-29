import * as React from 'react';
import useAccounts, { AccountId } from 'services/useAccounts';
import { DateRange, rangeToHttp } from 'Dates';
import { Transaction, incomeExpenseSplits } from 'Transaction';

/**
 * Fetch a ledger from the server
 */

const useTransactions = (
   accountIds: AccountId[] | undefined,  // undefined for all accounts
   range?: DateRange|undefined,  // undefined, to see forever
) => {
   const { accounts } = useAccounts();
   const [baseTrans, setBaseTrans] = React.useState<Transaction[]>([]);
   const idsForQuery = accountIds === undefined
      ? ''
      : accountIds.sort().join(',');
   const queryKeepIE = accountIds === undefined || accountIds.length > 1;

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/ledger/${idsForQuery}?${rangeToHttp(range)}`
            );
            const data: Transaction[] = await resp.json();
            setBaseTrans(data);
         }
         dofetch();
      },
      [idsForQuery, range]
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
