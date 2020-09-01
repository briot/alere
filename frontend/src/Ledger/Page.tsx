import * as React from 'react';
import { useParams } from 'react-router-dom';
import useAccounts from 'services/useAccounts';
import useHistory from 'services/useHistory';
import useTransactions from 'services/useTransactions';
import useDashboard from 'services/useDashboard';
import { Dashboard } from 'Dashboard';
import { BaseProps } from 'Dashboard/Module';
import { SplitMode, TransactionMode } from 'Ledger';
import { LedgerPanelProps } from 'Ledger/Module';
import { PriceHistoryModuleProps } from 'PriceHistory/Module';

const defaultPanels: BaseProps[] = [
   {
      type: 'pricehistory',
      accountId: 0,  // overridden later
      transactions: undefined,  // overridden later
      rowspan: 1,
      colspan: 4,
   } as PriceHistoryModuleProps,
   {
      type: 'ledger',
      accountIds: undefined,  // overridden later
      transactions: undefined,  // overridden later
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
      borders: false,
      defaultExpand: true,
      valueColumn: false,
      hideBalance: false,
      hideReconcile: false,
      rowspan: 4,
      colspan: 4,
   } as LedgerPanelProps,
];


interface LedgerPageProps {
   setHeader: (title: string|undefined) => void;
}
const LedgerPage: React.FC<LedgerPageProps> = p => {
   const { accountId } = useParams();
   const { accounts } = useAccounts();
   const { pushAccount } = useHistory();
   const account = accounts.getAccount(accountId);
   const transactions = useTransactions([accountId], "forever");
   const { panels, setPanels } = useDashboard('ledger', defaultPanels);

   React.useEffect(
      () => pushAccount(accountId),
      [accountId, pushAccount]
   );

   if (!account) {
      return <div>Unknown account</div>;
   }

   return (
      <Dashboard
         panels={panels}
         setPanels={setPanels}
         header={account.name}
         setHeader={p.setHeader}
         defaults={{
            accountId: accountId,
            accountIds: [accountId],
            transactions: transactions,
            range: "forever",
         }}
      />
   );
}

export default LedgerPage
