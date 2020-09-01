import React from 'react';
import { Route, Switch } from "react-router-dom";
import Header from 'Header';
import DashboardFromName from 'Dashboard';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import LedgerPage from 'Ledger/Page';
import usePrefs from 'services/usePrefs';
import StyleGuide from 'StyleGuide';
import { BaseProps } from 'Dashboard/Module';
import { IncomeExpensesProps } from 'Dashboard/IncomeExpenses';
import { NetworthPanelProps } from 'Dashboard/NetworthPanel';
import { QuadrantPanelProps } from 'Dashboard/QuadrantPanel';
import { LedgerPanelProps } from 'Ledger/Panel';
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

const App: React.FC<{}> = () => {
   const { prefs } = usePrefs();
   const [header, setHeader] = React.useState<string|undefined>('');

   return (
      <Switch>
         <Route path="/styleguide">
             <StyleGuide />
         </Route>
         <Route>
            <div id="app" className={prefs.dark_mode ? 'page darkpalette' : 'page lightpalette' }>
               <Header title={header} />
               <LeftSideBar />
               <RightSideBar />

               <Switch>
                   <Route path="/ledger/:accountId">
                      <LedgerPage setHeader={setHeader} />
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
