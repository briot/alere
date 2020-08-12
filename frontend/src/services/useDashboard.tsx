import * as React from 'react';
import { BaseProps } from 'Dashboard/Panels';
import { IncomeExpensesProps } from 'Dashboard/IncomeExpenses';
import { NetworthPanelProps } from 'Dashboard/NetworthPanel';
import { QuadrantPanelProps } from 'Dashboard/QuadrantPanel';

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
      type: 'upcoming',
      rowspan: 1,
      colspan: 1,
   },
   {
      type: 'quadrant',
      rowspan: 1,
      colspan: 1,
   } as QuadrantPanelProps,
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
   const [panels, setPanels] = React.useState<BaseProps[]>(defaultDashboard);
   const KEY = `dash-${name}`;

   // On startup, load preferences from local storage
   React.useEffect(
      () => {
         try {
            const p = JSON.parse(localStorage.getItem(KEY) || '');
            setPanels(p);
         } catch(e) {
         }
      },
      [KEY]
   );

   // Save dashboards when they change
   React.useEffect(
      () => localStorage.setItem(KEY, JSON.stringify(panels)),
      [panels, KEY]
   );

   return { panels, setPanels };
}
export default useDashboard;
