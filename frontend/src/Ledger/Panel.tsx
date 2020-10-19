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
   const accounts = useAccountIds(p.accountIds);
   const computedIds = accounts?.map(a => a.id);
   const transactions =
      useTransactions(computedIds, p.range, p.transactions);

   React.useEffect(
      () => {
         const name =
            p.accountIds === 'all' || !accounts
            ? 'All accounts'
            : p.accountIds === 'assets'
            ? 'All assets'
            : accounts.length === 1
            ? accounts[0]?.name
            : 'Multiple accounts';
         const dates = p.range ? rangeDisplay(p.range) : '';
         setHeader({title: `${name} ${dates}` });
      },
      [accounts, setHeader, p.range, p.accountIds]
   );

   const setSortOn = (sortOn: string) => p.setData({ sortOn });

   return (
      <Ledger
         {...p}
         accounts={accounts}
         transactions={transactions}
         setSortOn={setSortOn}
      />
   );
}
export default LedgerPanel;
