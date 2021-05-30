import * as React from 'react';
import Ledger, { BaseLedgerProps } from '@/Ledger/View';
import useTransactions from '@/services/useTransactions';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import Settings from '@/Ledger/Settings';
import usePrefs from '@/services/usePrefs';
import useQuery from '@/services/useQuery';

export interface LedgerPanelProps extends PanelBaseProps, BaseLedgerProps {
   type: 'ledger';
}

const LedgerPanel: React.FC<
   PanelProps<LedgerPanelProps>
> = p => {
   const query = useQuery({
      accountIds: p.props.accountIds,  // default
      range: p.props.range,
   });

   const { prefs } = usePrefs();
   const transactions = useTransactions(query.accounts.accounts, query.range);

   const setSortOn = (sortOn: string) => p.save({ sortOn });

   if (query.accounts.accounts.length === 0) {
      return null;
   }

   return (
      <Panel
         {...p}
         header={{name: query.accounts.title, range: query.range}}
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
export const registerLedger = {'ledger': LedgerPanel};
