import * as React from 'react';
import Ledger, { BaseLedgerProps } from 'Ledger/View';
import { rangeDisplay } from 'Dates';
import useAccountIds from 'services/useAccountIds';
import useTransactions from 'services/useTransactions';
import { Transaction } from 'Transaction';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import Settings from 'Ledger/Settings';
import { capitalize } from 'services/utils';

export interface LedgerPanelProps extends PanelBaseProps, BaseLedgerProps {
   type: 'ledger';
}

const LedgerPanel: React.FC<
   PanelProps<LedgerPanelProps>
   & { transactions?: Transaction[] } // possibly precomputed
> = p => {
   const { accounts, title } = useAccountIds(p.props.accountIds);
   const transactions = useTransactions(
      accounts, p.props.range, p.transactions);
   const setSortOn = (sortOn: string) => p.save({ sortOn });
   const r = p.props.range 
      ? rangeDisplay(p.props.range)
      : rangeDisplay("forever");

   return (
      <Panel
         {...p}
         header={{name: capitalize(`${r.possessive}transactions, ${title}`),
                  title: r.as_dates }}
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
            setSortOn={setSortOn}
         />
      </Panel>
   );
}
export const registerLedger = () => PANELS['ledger'] = LedgerPanel;
