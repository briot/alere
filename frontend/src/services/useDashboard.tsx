import * as React from 'react';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import { SetHeader } from 'Header';
import useSettings from 'services/useSettings';
import IncomeExpensesModule from 'IncomeExpense/Module';
import NetworthModule from 'NetWorth/Module';
import QuadrantModule from 'Cashflow/Quadrant';
import LedgerModule from 'Ledger/Module';
import PriceHistoryModule from 'PriceHistory/Module';
import CashflowModule from 'Cashflow/Module';
import InvestmentsModule from 'Investment/Module';
import MeanModule from 'Mean';

const NotAvailableModule: DashboardModule<BaseProps> = {
   Content: (p: BaseProps & SetHeader) => {
      const { setHeader } = p;
      React.useEffect(
         () => setHeader({ title: p.type }),
         [setHeader, p.type]
      );
      return <span>Not available</span>
   }
};

const DASHBOARD_MODULES: {[name: string]: DashboardModule<any>} = {
   "incomeexpenses": IncomeExpensesModule,
   "investments": InvestmentsModule,
   "ledger": LedgerModule,
   "mean": MeanModule,
   "metrics": CashflowModule,
   "networth": NetworthModule,
   "pricehistory": PriceHistoryModule,
   "quadrant": QuadrantModule,
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
   const v = useSettings<BaseProps[]>(`dash-${name}`, defaultPanels);
   return { panels: v.val, setPanels: v.setVal };
}
export default useDashboard;
