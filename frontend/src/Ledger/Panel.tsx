import * as React from 'react';
import Ledger, { BaseLedgerProps } from 'Ledger';
import { SetHeaderProps } from 'Dashboard/Panel';
import { rangeDisplay } from 'Dates';
import useAccountIds from 'services/useAccountIds';
import useTransactions from 'services/useTransactions';

const LedgerPanel: React.FC<BaseLedgerProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const accounts = useAccountIds(p.accountIds);
   const computedIds = accounts?.map(a => a.id);
   const transactions = useTransactions(computedIds, p.range, p.transactions);

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
         setHeader?.(`${name} ${dates}`);
      },
      [accounts, setHeader, p.range, p.accountIds]
   );

   return (
      <Ledger {...p} accounts={accounts} transactions={transactions} />
   );
}
export default LedgerPanel;
