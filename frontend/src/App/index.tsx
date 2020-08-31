import React from 'react';
import { Route, Switch } from "react-router-dom";
import Header from 'Header';
import DashboardFromName from 'Dashboard';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import { LedgerPage } from 'Ledger';
import usePrefs from 'services/usePrefs';
import StyleGuide from 'StyleGuide';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

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
                      <DashboardFromName setHeader={setHeader} name='Overview' />
                   </Route>
               </Switch>
            </div>
         </Route>
      </Switch>
   );
}

export default App;
