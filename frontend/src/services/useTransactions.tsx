import useAccounts, { Account } from '@/services/useAccounts';
import { DateRange, rangeToHttp } from '@/Dates';
import { Transaction, incomeExpenseSplits } from '@/Transaction';
import useFetch from '@/services/useFetch';

/**
 * Fetch a ledger from the server
 */

const useTransactions = (
   accountList: Account[],
   range: DateRange|undefined,   // undefined, to see forever
   refDate: Date,                // starting point of the date range
): Transaction[] => {
   const { accounts } = useAccounts();
   const idsForQuery = accountList.map(a => a.id).sort().join(',');
   const discardIE = accountList.length > 1;
   const { data } = useFetch({
      url: `/api/ledger/${idsForQuery}?${rangeToHttp(range, refDate)}`,
      placeholder: [],
      enabled: !!idsForQuery,
      parse: (json: Transaction[]) => {
         let trans = json ? [...json ] : [];
         trans.forEach(t =>
            t.splits.forEach(s => s.account = accounts.getAccount(s.accountId))
         );
         if (0 && discardIE) {   //  MANU
            // remove internal transfers
            trans = trans.filter(t => incomeExpenseSplits(t).length > 0);
         }
         return trans;
      },
   });
   return data as Transaction[];
}

export default useTransactions;
