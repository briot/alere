import React from 'react';
import { Route, Switch } from "react-router-dom";
import Dashboard from 'Dashboard';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import LedgerPage from 'LedgerPage';
import AccountsPage from 'AccountsPage';
import InvestmentPage from 'InvestmentsPage';
import usePrefs from 'services/usePrefs';
import Header, { HeaderProps } from 'Header';
import StyleGuide from 'StyleGuide';
import { PanelBaseProps } from 'Dashboard/Panel';
import { IncomeExpensePanelProps, registerIE } from 'IncomeExpense/Panel';
import { NetworthPanelProps, registerNetworth } from 'NetWorth/Panel';
import { LedgerPanelProps, registerLedger } from 'Ledger/Panel';
import { CashflowPanelProps, registerCashflow } from 'Cashflow/Panel';
import { MeanPanelProps, registerMean } from 'Mean/Panel';
import { registerPriceHistory } from 'PriceHistory/Panel';
import { SplitMode, NotesMode } from 'Ledger/View';
import { TreeMode } from 'services/useAccountTree';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

registerCashflow();
registerIE();
registerLedger();
registerMean();
registerNetworth();
registerPriceHistory();

const defaultOverview: PanelBaseProps[] = [
   {
      type: 'networth',
      rowspan: 2,
      colspan: 2,
      showValue: true,
      showShares: false,
      showPrice: false,
      threshold: 1e-6,
      dates: ["1 month ago", "today"],
      treeMode: TreeMode.USER_DEFINED,
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
      notes_mode: NotesMode.ONE_LINE,
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
   } as MeanPanelProps,
   {
      type: 'mean',
      range: 'forever',
      prior: 3,
      after: 3,
      expenses: false,
      rowspan: 1,
      colspan: 2,
   } as MeanPanelProps,
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
                   <Route path="/ledger/:accountIds" >
                      <LedgerPage setHeader={setHeader} />
                   </Route>
                   <Route path="/accounts">
                      <AccountsPage setHeader={setHeader} />
                   </Route>
                   <Route path="/investments">
                      <InvestmentPage setHeader={setHeader} />
                   </Route>
                   <Route>
                      <Dashboard
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
