import * as React from 'react';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import { SetHeaderProps } from 'Panel';
import IncomeExpensesModule from 'Dashboard/IncomeExpenses';
import NetworthModule from 'Dashboard/NetworthPanel';
import QuadrantModule from 'Dashboard/QuadrantPanel';
import LedgerModule from 'Ledger/Panel';
import PriceHistoryModule from 'PriceHistory/Module';

const NotAvailableModule: DashboardModule<BaseProps> = {
   Content: (p: BaseProps & SetHeaderProps) => {
      const { setHeader } = p;
      React.useEffect(
         () => setHeader?.(p.type),
         [setHeader, p.type]
      );
      return <span>Not available</span>
   }
};

const DASHBOARD_MODULES: {[name: string]: DashboardModule<any>} = {
   "incomeexpenses": IncomeExpensesModule,
   "networth": NetworthModule,
   "quadrant": QuadrantModule,
   "ledger": LedgerModule,
   "pricehistory": PriceHistoryModule,
};

export const getModule = (name: string): DashboardModule<any> =>
   DASHBOARD_MODULES[name] || NotAvailableModule;

interface DashboardType {
   panels: BaseProps[];
   setPanels: (p: (old: BaseProps[])=>BaseProps[]) => void;
}

/**
 * Load and return the contents of the dashboard with the given name
 */
const useDashboard = (
   name: string,
   defaultPanels: BaseProps[],
): DashboardType => {
   const KEY = `alere-dash-${name}`;
   const [panels, setPanels] = React.useState<BaseProps[]>(
      () => JSON.parse(localStorage.getItem(KEY) || 'null') || defaultPanels,
   );

   // Save dashboards when they change
   React.useEffect(
      () => localStorage.setItem(KEY, JSON.stringify(panels)),
      [panels, KEY]
   );

   return { panels, setPanels };
}
export default useDashboard;
