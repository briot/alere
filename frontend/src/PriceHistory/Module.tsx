import * as React from 'react';
import { SetHeader } from 'Header';
import { Transaction } from 'Transaction';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import useAccountIds from 'services/useAccountIds';
import PriceHistoryView from 'PriceHistory/View';
import Settings, { BasePriceHistoryProps } from 'PriceHistory/Settings';


interface HistoryPanelProps extends BasePriceHistoryProps {
   transactions: Transaction[],
}
const PriceHistoryPanel: React.FC<HistoryPanelProps & SetHeader> = p => {
   const { setHeader } = p;
   const { accounts, title } = useAccountIds(p.accountIds);
   React.useEffect(
      () => setHeader({ title: `Price History ${title}` }),
      [setHeader, title],
   );

   if (accounts.length !== 1) {
      return null;
   }

   return accounts?.[0] ? (
      <PriceHistoryView
         {...p}
         account={accounts?.[0]}
         transactions={p.transactions}
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
