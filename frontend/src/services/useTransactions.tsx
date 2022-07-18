import * as React from 'react';
import useAccounts, { Account } from '@/services/useAccounts';
import { DateRange, toDates } from '@/Dates';
import { Transaction, incomeExpenseSplits } from '@/Transaction';
import useFetch from '@/services/useFetch';

const NO_TRANSACTIONS: Transaction[] = [];

/**
 * Fetch a ledger from the server
 */

const useTransactions = (
   accountList: Account[],
   range: DateRange|undefined,   // undefined, to see forever
   refDate: Date|undefined,      // starting point of the date range
   includeScheduled?: boolean,
): Transaction[] => {
   const { accounts } = useAccounts();
   const discardIE = accountList.length > 1;
   const parse = React.useCallback(
      (resp: Transaction[]): Transaction[] => {
         resp.forEach(t =>
            t.splits.forEach(s =>
               s.account = accounts.getAccount(s.account_id)
            )
         );
         if (discardIE) {
            // remove internal transfers
            resp = resp.filter(t => incomeExpenseSplits(t).length > 0);
         }
         return resp;
      },
      [accounts, discardIE]
   );
   const args = React.useMemo(
      () => {
         const r = toDates(range ?? "all", refDate ?? new Date());
         return {
            mindate: r[0],
            maxdate: r[1],
            accountids: accountList.map(a => a.id),
            occurrences: includeScheduled ? 1 : 0,
         };
      },
      [range, accountList, includeScheduled, refDate],
   );

   window.console.log('MANU invoke ledger');
   const { data } = useFetch({cmd: 'ledger', args, parse });
   return data ?? NO_TRANSACTIONS;
}

export default useTransactions;
