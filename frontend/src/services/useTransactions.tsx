import * as React from 'react';
import useAccounts, { Account } from '@/services/useAccounts';
import { DateRange, toDates } from '@/Dates';
import { Transaction, incomeExpenseSplits } from '@/Transaction';
import { invoke } from '@tauri-apps/api'

const invokeLedger = (
   range: DateRange | undefined,
   accounts: Account[],
   include_scheduled: boolean | undefined,
): Promise<Transaction[]> => {
   const r = toDates(range ?? "all");
   return invoke('ledger', {
      mindate: r[0],
      maxdate: r[1],
      accountids: accounts.map(a => a.id),
      occurrences: include_scheduled ? 1 : 0,
   });
}

/**
 * Fetch a ledger from the server
 */

const useTransactions = (
   accountList: Account[],
   range: DateRange|undefined,   // undefined, to see forever
   refDate: Date,                // starting point of the date range
   includeScheduled?: boolean,
): Transaction[] => {
   const { accounts } = useAccounts();
   const discardIE = accountList.length > 1;
   const [data, setData] = React.useState<Transaction[]>([]);

   React.useEffect(
      () => {
          invokeLedger(range, accountList, includeScheduled)
             .then(resp => {
                resp.forEach(t =>
                   t.splits.forEach(s =>
                      s.account = accounts.getAccount(s.account_id)
                   )
                );
              if (discardIE) {
                 // remove internal transfers
                 resp = resp.filter(t => incomeExpenseSplits(t).length > 0);
              }
                setData(resp);
             });
      },
      [range, accountList, accounts, discardIE, includeScheduled]
   );
   return data;
}

export default useTransactions;
