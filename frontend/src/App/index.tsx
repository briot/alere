import React from 'react';
import Header from 'Header';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import Ledger from 'Ledger';
import { AccountId, Transaction } from 'Transaction';
import usePrefs from 'services/usePrefs';
import useAccounts from 'services/useAccounts';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const App: React.FC<{}> = () => {
   const [transactions, setTransactions] = React.useState<Transaction[]>([]);
   const { prefs } = usePrefs();

   const { accounts } = useAccounts();
   const accountId: AccountId = 'A000106';

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(`/api/ledger/${accountId}`);
            const data = await resp.json();
            setTransactions(data);
         }
         dofetch();
      },
      []
   );

   return (
     <div id="app" className={prefs.dark_mode ? 'dark' : 'light' }>
         <div className="bg">
            <div />
         </div>
         <div className="headerbg" />
         <Header
            title={accounts.name(accountId)}
         />
         <LeftSideBar />
         <RightSideBar />

         <Ledger
            transactions={transactions}
            accountId={accountId}
         />
     </div>
   );
}

export default App;
