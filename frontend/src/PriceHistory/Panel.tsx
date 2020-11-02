import * as React from 'react';
import PriceHistory, { PriceHistoryProps } from 'PriceHistory/View';
import Settings from 'PriceHistory/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import useAccountIds from 'services/useAccountIds';

export interface PriceHistoryPanelProps extends PanelBaseProps, PriceHistoryProps {
   type: 'pricehistory';
}

const PriceHistoryPanel: React.FC<PanelProps<PriceHistoryPanelProps>> = p => {
   const { accounts, title } = useAccountIds(p.props.accountIds ?? []);

   if (accounts.length !== 1) {
      return null;
   }

   return (
      <Panel
         {...p}
         header={{ name: `Price History ${title}` }}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <PriceHistory
            {...p.props}
            account={accounts[0]}
         />
      </Panel>
   );
}

export const registerPriceHistory =
   () => PANELS['pricehistory'] = PriceHistoryPanel;
