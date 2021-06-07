import * as React from 'react';
import Ledger, { BaseLedgerProps } from '@/Ledger/View';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import Settings from '@/Ledger/Settings';
import useSearch from '@/services/useSearch';

export interface LedgerPanelProps extends PanelBaseProps, BaseLedgerProps {
   type: 'ledger';
}

const LedgerPanel: React.FC<
   PanelProps<LedgerPanelProps>
> = p => {
   const query = useSearch({
      accountIds: p.props.accountIds,  // default
      range: p.props.range,
   });
   const setSortOn = (sortOn: string) => p.save({ sortOn });

   if (!query.accountIds || query.accounts.accounts.length === 0) {
      return null;
   }

   return (
      <Panel
         {...p}
         header={{name: query.accounts.title, range: query.range}}
         Settings={
            <Settings
               props={{...p.props,
                       accountIds: query.accountIds,
                       range: query.range}}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Ledger
            {...p.props}
            accountIds={query.accountIds}
            date={query.date}
            range={query.range}
            setSortOn={setSortOn}
         />
      </Panel>
   );
}
export const registerLedger = {'ledger': LedgerPanel};
