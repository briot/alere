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
   const dummy: Transaction[] = Array.from({length: 100}, (_, id) => ({
      id: id + 10,
      date: '2020-06-04',
      payee: 'garage',
      balance: 8200 - id * 100,
      splits: [
         {account: 'expense:car', amount: 100},
         {account: 'assets:boursorama:commun', amount: -100, },
      ]
   }));
   const real: Transaction[] = [
      {
         id: 0,
         date: '2020-06-01',
         payee: 'random payee',
         balance: 800,
         splits: [
            {account: 'expenses:car', amount: -200, },
            {account: 'assets:boursorama:commun', amount: 200, },
         ]
      },
      {
         id: 1,
         date: '2020-06-02',
         payee: 'copied from gnucash',
         balance: 4500,
         notes: 'gift from Y',
         splits: [
            {account: 'income:salary', amount: -4200, },
            {account: 'expenses:taxes', amount: 500, },
            {account: 'assets:boursorama:commun', amount: 3700, },
         ]
      },
      {
         id: 2,
         date: '2020-06-02',
         payee: 'copied from gnucash',
         balance: 8200,
         splits: [
            {account: 'income:salary', amount: -4200, },
            {account: 'expenses:taxes', amount: 500, },
            {account: 'assets:boursorama:commun', amount: 3700, },
         ]
      },
      {
         id: 3,
         date: '2020-06-03',
         payee: 'with notes',
         balance: 8300,
         notes: 'gift from X',
         splits: [
            {account: 'income:cadeau', amount: -100, },
            {account: 'assets:boursorama:commun', amount: 100, },
         ]
      },
   ]
   const transactions: Transaction[] = real.concat(dummy);

   const accountName = 'assets:boursorama:commun';
   const options = {
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
   }

   return (
     <div id="app">
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
