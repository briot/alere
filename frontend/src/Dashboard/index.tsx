import * as React from 'react';
import { BaseProps } from 'Dashboard/Panels';
import Panel from 'Panel';
import IncomeExpenses, {
   isIncomeExpense, IncomeExpensesProps } from 'Dashboard/IncomeExpenses';
import NetworthPanel, {
   isNetworth, NetworthPanelProps } from 'Dashboard/NetworthPanel';
import QuadrantPanel, {
   isQuadrant, QuadrantPanelProps } from 'Dashboard/QuadrantPanel';
import './Dashboard.css';

interface PanelProps {
   panels: BaseProps[];
   setPanels: (p: (old: BaseProps[]) => BaseProps[]) => void;
   index: number;
}

const DashboardPanel: React.FC<PanelProps> = p => {
   const { setPanels } = p;
   const localChange = React.useCallback(
      (a: Partial<BaseProps>) =>
         setPanels(old => {
            const n = [...old];
            n[p.index] = {...n[p.index], ...a};
            return n;
         }),
      [setPanels, p.index]
   );

   const p2 = p.panels[p.index];
   if (isIncomeExpense(p2)) {
      return <IncomeExpenses data={p2} setData={localChange} />
   } else if (isNetworth(p2)) {
      return <NetworthPanel data={p2} setData={localChange} />
   } else if (isQuadrant(p2)) {
      return <QuadrantPanel data={p2} setData={localChange} />
   } else {
      return <Panel header={p2.type}>Not available</Panel>
   }
}


interface DashboardProps {
   setHeader?: (title: string|undefined) => void;
}

const Dashboard: React.FC<DashboardProps> = p => {
   const [ panels, setPanels ] = React.useState<BaseProps[]>([
      {
         type: 'networth',
         rowspan: 2,
         colspan: 2,
         showShares: false,
         showPrice: false,
         dates: ["today", "end of last month", "end of last year"],
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
   ]);

   const { setHeader } = p;

   React.useEffect(
      () => setHeader?.('Overview'),
      [setHeader]
   );

   return (
      <div className="dashboard">
         {
            panels.map((p2, idx) =>
               <DashboardPanel
                  key={idx}
                  panels={panels}
                  setPanels={setPanels}
                  index={idx} />
            )
         }
      </div>
   );
}

export default Dashboard;
