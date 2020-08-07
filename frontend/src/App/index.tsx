import React from 'react';
import { Route, Switch } from "react-router-dom";
import Header from 'Header';
import Dashboard from 'Dashboard';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import Ledger from 'Ledger';
import { AccountId } from 'Transaction';
import usePrefs from 'services/usePrefs';
import useAccounts from 'services/useAccounts';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const App: React.FC<{}> = () => {
   const { prefs } = usePrefs();
   const { accounts } = useAccounts();
   const accountId: AccountId = 'A000106';

   return (
     <div id="app" className={prefs.dark_mode ? 'dark' : 'light' }>
         <div className="headerbg" />
         <LeftSideBar />
         <RightSideBar />

         <Switch>
             <Route path="/dashboard">
                <Header title="Overview" />
                <Dashboard />
             </Route>
             <Route path="/ledger/:id">
                {/*<div className="bg circle"><div /></div>*/}
                <Header title={accounts.name(accountId)} />
                <Ledger accountId={accountId} />
             </Route>
         </Switch>

     </div>
   );
}

export default App;
