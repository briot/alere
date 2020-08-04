import React from 'react';
import Header from 'Header';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import { default as Ledger, LedgerOptions, SplitMode,
         TransactionMode } from 'Ledger';
import { AccountId, Transaction } from 'Transaction';
import useAccounts from 'services/useAccounts';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const App: React.FC<{}> = () => {
   const [transactions, setTransactions] = React.useState<Transaction[]>([]);
   const [ledgerOps, setLedgerOps] = React.useState<LedgerOptions>({
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
      borders: false,
      defaultExpand: true,
   });

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
     <div id="app">
         <div className="headerbg" />
         <Header
            ledger={ledgerOps}
            setLedger={setLedgerOps}
            title={accounts.name(accountId)}
         />
         <LeftSideBar />
         <RightSideBar />

         <Ledger
            transactions={transactions}
            accountId={accountId}
            options={ledgerOps}
         />
     </div>
   );
}

export default App;
