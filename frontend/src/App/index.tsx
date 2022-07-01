import * as React from 'react';
import { useLocation, BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import Header, { HeaderProps } from '@/Header';
import LeftSideBar from '@/LeftSideBar';
import OnlineUpdate from '@/Header/OnlineUpdate';
import Settings from '@/Settings';
import Spinner from '@/Spinner';
import StyleGuide from '@/StyleGuide';
import classes from '@/services/classes';
import useAccounts from '@/services/useAccounts';
import usePrefs from '@/services/usePrefs';
import { AccountsProvider } from '@/services/useAccounts';
import { HistProvider } from '@/services/useHistory';
import { Page } from '@/Page';
import { PagesProvider } from '@/services/usePages';
import { PrefProvider } from '@/services/usePrefs';
import { QueryClient, QueryClientProvider } from 'react-query';
import { TooltipProvider } from '@/Tooltip';

import './App.scss';
import "font-awesome/css/font-awesome.min.css";

const queryClient = new QueryClient({
   defaultOptions: {
     queries: {
       staleTime: 5 * 60000,  // 5min
     },
   },
});

const Main: React.FC<{}> = () => {
   const location = useLocation();
   const { prefs } = usePrefs();
   const [ header, setHeader ] = React.useState<HeaderProps>({});
   const { accounts } = useAccounts();
   const c = classes(
      'page',
      prefs.neumorph_mode ? 'neumorph_mode' : 'not_neumorph_mode',
   );
   window.console.log('MANU Main accounts.loaded=', accounts.loaded,
      'has_accounts=', accounts.has_accounts(),
   );

   return (
      <Switch>
         <Route path="/styleguide">
             <StyleGuide />
         </Route>
         <Route>
            <div className={prefs.dark_mode ? 'darkpalette' : 'lightpalette'}>
               <div id="app" className={c} >
                  <Header {...header} >
                     <OnlineUpdate />
                     <Settings />
                  </Header>
                  <LeftSideBar />
                  <Route path="/welcome">
                      <Page setHeader={setHeader} url={location.pathname} />
                  </Route>
                  <Route>
                     {
                        !accounts.loaded
                        ? <div className="dashboard main"><Spinner /></div>
                        : !accounts.has_accounts()
                        ? <Redirect to="/welcome" />
                        : <Page setHeader={setHeader} url={location.pathname} />
                     }
                  </Route>
               </div>
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
                            <PagesProvider>
                               <Main />
                            </PagesProvider>
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
