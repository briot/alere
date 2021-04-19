import AccountsPage from 'AccountsPage';
import Dashboard from 'Dashboard';
import Header, { HeaderProps } from 'Header';
import InvestmentPage from 'InvestmentsPage';
import PerformancePage from 'PerformancePage';
import NetworthPage from 'NetWorthPage';
import LedgerPage from 'LedgerPage';
import LeftSideBar from 'LeftSideBar';
import React from 'react';
import RightSideBar from 'RightSideBar';
import Spinner from 'Spinner';
import StyleGuide from 'StyleGuide';
import useAccounts from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import { AccountsProvider } from 'services/useAccounts';
import { BrowserRouter } from "react-router-dom";
import { CashflowPanelProps, registerCashflow } from 'Cashflow/Panel';
import { HistProvider } from 'services/useHistory';
import { IncomeExpensePanelProps, registerIE } from 'IncomeExpense/Panel';
import { LedgerPanelProps, registerLedger } from 'Ledger/Panel';
import { MeanPanelProps, registerMean } from 'Mean/Panel';
import { NetworthHistoryPanelProps,
   registerNetworthHistory } from 'NWHistory/Panel';
import { NetworthPanelProps, registerNetworth } from 'NetWorth/Panel';
import { PanelBaseProps } from 'Dashboard/Panel';
import { PrefProvider } from 'services/usePrefs';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Route, Switch } from "react-router-dom";
import { SplitMode, NotesMode } from 'Ledger/View';
import { TooltipProvider } from 'Tooltip';
import { TreeMode } from 'services/useAccountTree';
import { WelcomePanelProps, registerWelcome } from 'Welcome/Panel';
import { registerAccounts } from 'Accounts/Panel';
import { registerInvestments } from 'Investments/Panel';
import { registerPerformance } from 'Performance/Panel';
import { registerPriceHistory } from 'PriceHistory/Panel';
import { registerRecent } from 'Recent/Panel';
import { registerTicker } from 'Ticker/Panel';

import './App.css';
import "font-awesome/css/font-awesome.min.css";

registerAccounts();
registerCashflow();
registerIE();
registerInvestments();
registerLedger();
registerMean();
registerNetworth();
registerNetworthHistory();
registerPerformance();
registerPriceHistory();
registerRecent();
registerTicker();
registerWelcome();

const queryClient = new QueryClient({
   defaultOptions: {
     queries: {
       staleTime: 5 * 60000,  // 5min
     },
   },
});

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

const Main: React.FC<{}> = () => {
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
                         <Route path="/performance">
                            <PerformancePage setHeader={setHeader} />
                         </Route>
                         <Route path="/networth">
                            <NetworthPage setHeader={setHeader} />
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

const App: React.FC<{}> = () => {
   return (
      <React.StrictMode>
          <BrowserRouter>
             <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                   <PrefProvider>
                      <HistProvider>
                         <AccountsProvider>
                            <Main />
                         </AccountsProvider>
                      </HistProvider>
                   </PrefProvider>
                </TooltipProvider>
            </QueryClientProvider>
          </BrowserRouter>
      </React.StrictMode>
   );
}

export default App;
