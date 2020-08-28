import * as React from 'react';
import { BaseProps, DashboardModule } from 'Dashboard/Panels';
import IncomeExpensesModule, { IncomeExpensesProps } from 'Dashboard/IncomeExpenses';
import NetworthModule, { NetworthPanelProps } from 'Dashboard/NetworthPanel';
import QuadrantModule, { QuadrantPanelProps } from 'Dashboard/QuadrantPanel';
import LedgerModule, { LedgerPanelProps } from 'Dashboard/LedgerPanel';
import { SplitMode, TransactionMode } from 'services/usePrefs';

export const DASHBOARD_MODULES: {[name: string]: DashboardModule<any>} = {
   "incomeexpenses": IncomeExpensesModule,
   "networth": NetworthModule,
   "quadrant": QuadrantModule,
   "ledger": LedgerModule,
};

const defaultDashboard: BaseProps[] = [
   {
      type: 'networth',
      rowspan: 2,
      colspan: 2,
      showValue: true,
      showShares: false,
      showPrice: false,
      dates: ["today", "end of last month"],
   } as NetworthPanelProps,
   {
      type: 'incomeexpenses',
      rowspan: 1,
      colspan: 2,
      expenses: true,
      range: "current year",
   } as IncomeExpensesProps,
   {
      type: 'incomeexpenses',
      rowspan: 1,
      colspan: 2,
      expenses: false,
      range: "current year",
   } as IncomeExpensesProps,
   {
      type: 'quadrant',
      rowspan: 1,
      colspan: 2,
   } as QuadrantPanelProps,
   {
      type: 'ledger',
      accountIds: undefined,
      range: 'future',
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
      borders: false,
      defaultExpand: false,
      valueColumn: true,
      hideBalance: true,
      hideReconcile: true,
      rowspan: 2,
      colspan: 2,
   } as LedgerPanelProps,
   {
      type: 'upcoming',
      rowspan: 1,
      colspan: 1,
   },
   {
      type: 'p&l',
      rowspan: 1,
      colspan: 1,
   },
];

interface DashboardType {
   panels: BaseProps[];
   setPanels: (p: (old: BaseProps[])=>BaseProps[]) => void;
}

/**
 * Load and return the contents of the dashboard with the given name
 */
const useDashboard = (name: string): DashboardType => {
   const KEY = `alere-dash-${name}`;
   const [panels, setPanels] = React.useState<BaseProps[]>(
      () => JSON.parse(localStorage.getItem(KEY) || '') || defaultDashboard,
   );

   // Save dashboards when they change
   React.useEffect(
      () => localStorage.setItem(KEY, JSON.stringify(panels)),
      [panels, KEY]
   );

   return { panels, setPanels };
}
export default useDashboard;
