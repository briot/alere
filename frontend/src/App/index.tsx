import React from 'react';
import { Route, Switch } from "react-router-dom";
import Header from 'Header';
import Dashboard from 'Dashboard';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import Ledger from 'Ledger';
import usePrefs from 'services/usePrefs';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const App: React.FC<{}> = () => {
   const { prefs } = usePrefs();
   const [header, setHeader] = React.useState<string|undefined>('');

   return (
     <div id="app" className={prefs.dark_mode ? 'dark' : 'light' }>
         <div className="headerbg" />
         <Header title={header} />
         <LeftSideBar />
         <RightSideBar />

         <Switch>
             <Route path="/ledger/:accountId">
                <Ledger setHeader={setHeader} />
             </Route>
             <Route>
                <Dashboard setHeader={setHeader} />
             </Route>
         </Switch>

     </div>
   );
}

export default App;
