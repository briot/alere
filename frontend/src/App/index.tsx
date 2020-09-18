import React from 'react';
import { Route, Switch } from "react-router-dom";
import DashboardFromName from 'Dashboard';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import LedgerPage from 'Ledger/Page';
import InvestmentPage from 'Investment/Page';
import usePrefs from 'services/usePrefs';
import Header, { HeaderProps } from 'Header';
import StyleGuide from 'StyleGuide';
import { BaseProps } from 'Dashboard/Module';
import { IncomeExpensePanelProps } from 'IncomeExpense/Module';
import { NetworthPanelProps } from 'NetWorth/Module';
import { LedgerPanelProps } from 'Ledger/Module';
import { CashflowPanelProps } from 'Cashflow/Module';
import { MeanModuleProps } from 'Mean';
import { SplitMode, TransactionMode } from 'Ledger';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const defaultOverview: BaseProps[] = [
   {
      type: 'networth',
      rowspan: 2,
      colspan: 2,
      showValue: true,
      showShares: false,
      showPrice: false,
      dates: ["today", "1 month ago"],
   } as NetworthPanelProps,
   {
      type: 'incomeexpenses',
      rowspan: 1,
      colspan: 2,
      expenses: true,
      range: "current year",
   } as IncomeExpensePanelProps,
   {
      type: 'incomeexpenses',
      rowspan: 1,
      colspan: 2,
      expenses: false,
      range: "current year",
   } as IncomeExpensePanelProps,
   {
      type: 'metrics',
      range: "12months",
      rowspan: 3,
      colspan: 2,
   } as CashflowPanelProps,
   {
      type: 'ledger',
      accountIds: 'assets',
      range: 'future',
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
      borders: false,
      defaultExpand: false,
      valueColumn: true,
      hideBalance: true,
      hideReconcile: true,
      rowspan: 1,
      colspan: 2,
   } as LedgerPanelProps,
   {
      type: 'mean',
      range: 'forever',
      prior: 3,
      after: 3,
      expenses: true,
      rowspan: 1,
      colspan: 2,
   } as MeanModuleProps,
   {
      type: 'mean',
      range: 'forever',
      prior: 3,
      after: 3,
      expenses: false,
      rowspan: 1,
      colspan: 2,
   } as MeanModuleProps,
   // {
   //    type: 'upcoming',
   //    rowspan: 1,
   //    colspan: 1,
   // },
   // {
   //    type: 'quadrant',
   //    rowspan: 1,
   //    colspan: 2,
   // } as QuadrantPanelProps,
];

const App: React.FC<{}> = () => {
   const { prefs } = usePrefs();
   const [ header, setHeader ] = React.useState<HeaderProps>({});

   return (
      <Switch>
         <Route path="/styleguide">
             <StyleGuide />
         </Route>
         <Route>
            <div id="app" className={prefs.dark_mode ? 'page darkpalette' : 'page lightpalette' }>
               <Header {...header} />
               <LeftSideBar />
               <RightSideBar />

               <Switch>
                   <Route path="/ledger/:accountId" >
                      <LedgerPage setHeader={setHeader} />
                   </Route>
                   <Route path="/investments">
                      <InvestmentPage setHeader={setHeader} />
                   </Route>
                   <Route>
                      <DashboardFromName
                         defaultPanels={defaultOverview}
                         setHeader={setHeader}
                         name='Overview'
                      />
                   </Route>
               </Switch>
            </div>
         </Route>
      </Switch>
   );
}

export default App;
