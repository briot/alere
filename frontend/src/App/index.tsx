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
import Spinner from 'Spinner';
import { PanelBaseProps } from 'Dashboard/Panel';
import { IncomeExpensePanelProps, registerIE } from 'IncomeExpense/Panel';
import { NetworthPanelProps, registerNetworth } from 'NetWorth/Panel';
import { LedgerPanelProps, registerLedger } from 'Ledger/Panel';
import { CashflowPanelProps, registerCashflow } from 'Cashflow/Panel';
import { MeanPanelProps, registerMean } from 'Mean/Panel';
import { registerPriceHistory } from 'PriceHistory/Panel';
import { registerInvestments } from 'Investments/Panel';
import { registerTicker } from 'Ticker/Panel';
import { registerRecent } from 'Recent/Panel';
import { WelcomePanelProps, registerWelcome } from 'Welcome/Panel';
import { NetworthHistoryPanelProps,
   registerNetworthHistory } from 'NWHistory/Panel';
import { SplitMode, NotesMode } from 'Ledger/View';
import { TreeMode } from 'services/useAccountTree';
import useAccounts from 'services/useAccounts';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

registerCashflow();
registerIE();
registerInvestments();
registerLedger();
registerMean();
registerNetworth();
registerNetworthHistory();
registerPriceHistory();
registerRecent();
registerTicker();
registerWelcome();

const defaultOverview: PanelBaseProps[] = [
   {
      type: 'networth',
      rowspan: 2,
      colspan: 2,
      showValue: true,
      showShares: false,
      showPrice: false,
      roundValues: true,
      showDeltaLast: true,
      threshold: 1e-6,
      dates: ["1 year ago", "1 month ago", "today"],
      treeMode: TreeMode.USER_DEFINED,
   } as NetworthPanelProps,
   {
      type: 'incomeexpenses',
      rowspan: 1,
      colspan: 2,
      expenses: true,
      roundValues: true,
      range: '1year',
   } as IncomeExpensePanelProps,
   {
      type: 'incomeexpenses',
      rowspan: 1,
      colspan: 2,
      expenses: false,
      roundValues: true,
      range: '1year',
   } as IncomeExpensePanelProps,
   {
      type: 'metrics',
      range: "1year",
      roundValues: true,
      rowspan: 4,
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
      range: '1year',
      prior: 2,
      after: 2,
      showExpenses: true,
      showIncome: true,
      showUnrealized: true,
      negateExpenses: true,
      showMean: true,
      rowspan: 2,
      colspan: 2,
   } as MeanPanelProps,
   {
      type: 'nwhist',
      range: 'forever',
      prior: 2,
      after: 2,
      rowspan: 1,
      colspan: 2,
   } as NetworthHistoryPanelProps,
];

const App: React.FC<{}> = () => {
   const { prefs } = usePrefs();
   const [ header, setHeader ] = React.useState<HeaderProps>({});
   const { accounts } = useAccounts();

   return (
      <Switch>
         <Route path="/styleguide">
             <StyleGuide />
         </Route>
         <Route>
            <div
               id="app"
               className={
                  prefs.dark_mode ? 'page darkpalette' : 'page lightpalette' }
            >
               <Header {...header} />
               <LeftSideBar />
               <RightSideBar />

               {
                  !accounts.loaded
                  ? <div className="dashboard main"><Spinner /></div>
                  : !accounts.has_accounts()
                  ? (
                     <Dashboard
                        defaultPanels={[
                           {
                              type: 'welcome',
                              rowspan: 4,
                              colspan: 4,
                           } as WelcomePanelProps,
                        ]}
                        setHeader={setHeader}
                        className="main"
                        name=''
                     />
                  ) : (
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
                               className="main"
                               name='Overview'
                            />
                         </Route>
                     </Switch>
                  )
               }
            </div>
         </Route>
      </Switch>
   );
}

export default App;
