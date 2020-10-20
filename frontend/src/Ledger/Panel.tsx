import * as React from 'react';
import Ledger, { BaseLedgerProps } from 'Ledger';
import { SaveData } from 'Dashboard/Module';
import { SetHeader } from 'Header';
import { rangeDisplay } from 'Dates';
import useAccountIds from 'services/useAccountIds';
import useTransactions from 'services/useTransactions';
import { Transaction } from 'Transaction';

const LedgerPanel: React.FC<
   BaseLedgerProps & SetHeader & SaveData<BaseLedgerProps>
   & { transactions?: Transaction[] }
> = p => {
   const { setHeader } = p;
   const { accounts, title } = useAccountIds(p.accountIds);
   const transactions = useTransactions(accounts, p.range, p.transactions);

   React.useEffect(
      () => {
         const dates = p.range ? rangeDisplay(p.range) : '';
         setHeader({title: `${title} ${dates}` });
      },
      [title, setHeader, p.range]
   );

   const setSortOn = (sortOn: string) => p.setData({ sortOn });

   return (
      <Ledger
         {...p}
         transactions={transactions}
         setSortOn={setSortOn}
      />
   );
}
export default LedgerPanel;
