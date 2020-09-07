import * as React from 'react';
import { SetHeaderProps } from 'Dashboard/Panel';
import { Transaction } from 'Transaction';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import useAccountIds from 'services/useAccountIds';
import useTransactions from 'services/useTransactions';
import PriceHistoryView from 'PriceHistory/View';
import Settings, { BasePriceHistoryProps } from 'PriceHistory/Settings';


interface HistoryPanelProps extends BasePriceHistoryProps {
   transactions: Transaction[] | undefined, // use it instead of fetching
}
const PriceHistoryPanel: React.FC<HistoryPanelProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const accounts = useAccountIds([p.accountId]);
   const transactions = useTransactions([p.accountId], p.range, p.transactions);
   React.useEffect(
      () => setHeader?.('Price History'),
      [setHeader],
   );
   return accounts?.[0] ? (
      <PriceHistoryView
         {...p}
         account={accounts?.[0]}
         transactions={transactions}
      />
   ) : null;
}

export interface PriceHistoryModuleProps extends HistoryPanelProps, BaseProps {
   type: 'pricehistory',
}

const PriceHistoryModule: DashboardModule<PriceHistoryModuleProps> = {
   Settings,
   Content: PriceHistoryPanel,
}
export default PriceHistoryModule;
