import * as React from 'react';
import { useHistory, useLocation, BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import LeftSideBar from '@/LeftSideBar';
import useOnlineUpdate from '@/Header/OnlineUpdate';
import Spinner from '@/Spinner';
import StyleGuide from '@/StyleGuide';
import classes from '@/services/classes';
import useAccounts from '@/services/useAccounts';
import usePrefs from '@/services/usePrefs';
import Settings from '@/Settings';
import { AccountsProvider } from '@/services/useAccounts';
import { HistProvider } from '@/services/useHistory';
import { Page } from '@/Page';
import { PagesProvider } from '@/services/usePages';
import { PrefProvider } from '@/services/usePrefs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/Tooltip';
import { listen, Event } from '@tauri-apps/api/event';
// import { save, open } from "@tauri-apps/api/dialog";
// import { readTextFile } from "@tauri-apps/api/fs";

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
   const { accounts } = useAccounts();
   const history = useHistory();
   const { update } = useOnlineUpdate();
   const c = classes(
      'page',
      prefs.neumorph_mode ? 'neumorph_mode' : 'not_neumorph_mode',
   );
   const [showSettings, setShowSettings] = React.useState(false);

   const on_dialog_close = React.useCallback(
      () => setShowSettings(false),
      [setShowSettings]
   );

   const open_file = React.useCallback(
      async () => {
         history.push('/welcome');
         return;

//         try {
//            let filepath = await save();
//            if (typeof filepath == 'string') {
//               let content = await readTextFile(filepath);
//               window.console.log('MANU read text',
//                  content.length, ' bytes from ', filepath);
//            }
//         } catch (e) {
//            console.log(e);
//         }
      },
      [history]
   );

   React.useEffect(
      () => {
         const unlisten = listen("menu-event", (e: Event<string>) => {
            switch (e.payload) {
               case 'open':
                  open_file();
                  break;
               case 'update_prices':
                  update();
                  break;
               case 'settings':
                  setShowSettings(true);
                  break;
               default:
                  window.console.log('ignored menu-event', e.payload);
            }
         });
         return () => {
            unlisten.then(f => f());
         };
      },
      [open_file, update]
   );

   return (
      <Switch>
         <Route path="/styleguide">
             <StyleGuide />
         </Route>
         <Route>
            <div className={prefs.dark_mode ? 'darkpalette' : 'lightpalette'}>
               <div id="app" className={c} >
                  <LeftSideBar />
                  <Route path="/welcome">
                      <Page url={location.pathname} />
                  </Route>
                  <Route>
                     {
                        !accounts.loaded
                        ? <div className="dashboard main"><Spinner /></div>
                        : !accounts.has_accounts()
                        ? <Redirect to="/welcome" />
                        : <Page url={location.pathname} />
                     }
                  </Route>
               </div>

               {
                   showSettings &&
                   <Settings onclose={on_dialog_close} />
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
