import React from 'react';
import Header from 'Header';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
// import Footer from 'Footer';
import { default as Ledger, SplitMode, TransactionMode } from 'Ledger';
import { Transaction } from 'Transaction';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const App: React.FC<{}> = () => {
   const [transactions, setTransactions] = React.useState<Transaction[]>([]);

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

   const accountName = 'assets:boursorama:commun';
   const options = {
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
   }

   return (
     <div id="app">
         <div className="headerbg" />
         <Header title={accountName} />
         <LeftSideBar />
         <RightSideBar />
         { /* <Footer /> */ }

         <Ledger
            transactions={transactions}
            accountName={accountName}
            options={options}
         />
     </div>
   );
}

export default App;
