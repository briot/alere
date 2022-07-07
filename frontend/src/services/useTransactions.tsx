import * as React from 'react';
import useAccounts, { Account } from '@/services/useAccounts';
import { DateRange, toDates } from '@/Dates';
import { Transaction, incomeExpenseSplits } from '@/Transaction';
import { invoke } from '@tauri-apps/api'

const invokeLedger = (
   range: DateRange | undefined,
   accounts: Account[],
): Promise<Transaction[]> => {
   const r = toDates(range ?? "all");
   window.console.log('MANU invokeLedger', range, r);
   return invoke('ledger', {
      mindate: r[0],
      maxdate: r[1],
      account_ids: accounts.map(a => a.id).sort().join(','),
   });
}

/**
 * Fetch a ledger from the server
 */

const useTransactions = (
   accountList: Account[],
   range: DateRange|undefined,   // undefined, to see forever
   refDate: Date,                // starting point of the date range
): Transaction[] => {
   const { accounts } = useAccounts();
   const discardIE = accountList.length > 1;
   const [data, setData] = React.useState<Transaction[]>([]);

   React.useEffect(
      () => {
          invokeLedger(range, accountList)
             .then(resp => setData(resp));
      },
      [range, accountList]
   );

//   const { data } = useFetch({
//      url: `/api/ledger/${idsForQuery}?${rangeToHttp(range, refDate)}`,
//      placeholder: [],
//      enabled: !!idsForQuery,
//      parse: (json: Transaction[]) => {
//         let trans = json ? [...json ] : [];
//         trans.forEach(t =>
//            t.splits.forEach(s => s.account = accounts.getAccount(s.accountId))
//         );
//         if (0 && discardIE) {   //  MANU
//            // remove internal transfers
//            trans = trans.filter(t => incomeExpenseSplits(t).length > 0);
//         }
//         return trans;
//      },
//   });
   return data as Transaction[];
}

export default useTransactions;
