import * as React from 'react';
import Ledger, { BaseLedgerProps } from '@/Ledger/View';
import useAccountIds from '@/services/useAccountIds';
import useTransactions from '@/services/useTransactions';
import { Transaction } from '@/Transaction';
import Panel, { PanelProps, PanelBaseProps, PANELS } from '@/Dashboard/Panel';
import Settings from '@/Ledger/Settings';
import usePrefs from '@/services/usePrefs';

export interface LedgerPanelProps extends PanelBaseProps, BaseLedgerProps {
   type: 'ledger';
}

const LedgerPanel: React.FC<
   PanelProps<LedgerPanelProps>
   & { transactions?: Transaction[] } // possibly precomputed
> = p => {
   const { accounts, title } = useAccountIds(p.props.accountIds);
   const { prefs } = usePrefs();
   const transactions = useTransactions(
      accounts, p.props.range, p.transactions);
   const setSortOn = (sortOn: string) => p.save({ sortOn });

   if (accounts.length === 0) {
      return null;
   }

   return (
      <Panel
         {...p}
         header={{name: title, range: p.props.range}}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Ledger
            {...p.props}
            transactions={transactions}
            prefs={prefs}
            setSortOn={setSortOn}
         />
      </Panel>
   );
}
export const registerLedger = () => PANELS['ledger'] = LedgerPanel;
