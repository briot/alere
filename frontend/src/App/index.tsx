import React from 'react';
import { Route, Switch } from "react-router-dom";
import Header from 'Header';
import Dashboard from 'Dashboard';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import { LedgerPage } from 'Ledger';
import usePrefs from 'services/usePrefs';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const App: React.FC<{}> = () => {
   const { prefs } = usePrefs();
   const [header, setHeader] = React.useState<string|undefined>('');

   return (
     <div id="app" className={prefs.dark_mode ? 'dark' : 'light' }>
         <Header title={header} />
         <LeftSideBar />
         <RightSideBar />

         <Switch>
             <Route path="/ledger/:accountId">
                <LedgerPage setHeader={setHeader} />
             </Route>
             <Route>
                <Dashboard setHeader={setHeader} />
             </Route>
         </Switch>

     </div>
   );
}

export default App;
