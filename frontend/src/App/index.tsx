import React from 'react';
import Header from 'Header';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import { default as Ledger, SplitMode, TransactionMode } from 'Ledger';
import { Transaction } from 'Transaction';
import useAccounts from 'services/useAccounts';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const App: React.FC<{}> = () => {
   const [transactions, setTransactions] = React.useState<Transaction[]>([]);
   const { accounts } = useAccounts();

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch('/api/ledger/1');
            const data = await resp.json();
            setTransactions(data);
         }
         dofetch();
      },
      []
   );

   const accountId = 1;
   const options = {
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
   }

   return (
     <div id="app">
         <div className="headerbg" />
         <Header title={accounts.name(accountId)} />
         <LeftSideBar />
         <RightSideBar />

         <Ledger
            transactions={transactions}
            accountId={accountId}
            options={options}
         />
     </div>
   );
}

export default App;
