import * as React from 'react';
import Ledger, { BaseLedgerProps } from 'Ledger';
import { SetHeaderProps } from 'Dashboard/Panel';
import { rangeDisplay } from 'Dates';
import useAccountIds from 'services/useAccountIds';
import useTransactions from 'services/useTransactions';

const LedgerPanel: React.FC<BaseLedgerProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const accounts = useAccountIds(p.accountIds);
   const transactions = useTransactions(p.accountIds, p.range, p.transactions);

   React.useEffect(
      () => {
         const name = p.accounts === undefined
            ? 'All accounts'
            : p.accounts.length === 1
            ? p.accounts[0]?.name
            : 'Multiple accounts';
         const dates = p.range ? rangeDisplay(p.range) : '';
         setHeader?.(`${name} ${dates}`);
      },
      [p.accounts, setHeader, p.range]
   );

   return (
      <Ledger {...p} accounts={accounts} transactions={transactions} />
   );
}
export default LedgerPanel;
