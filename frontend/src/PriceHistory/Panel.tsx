import * as React from 'react';
import Settings from 'PriceHistory/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import PriceGraph, { PriceGraphProps } from 'PriceGraph';

export interface PriceHistoryPanelProps extends PanelBaseProps, PriceGraphProps {
   type: 'pricehistory';
}

const PriceHistoryPanel: React.FC<PanelProps<PriceHistoryPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ name: `Price History` }}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <PriceGraph
            {...p.props}
         />
      </Panel>
   );
}

export const registerPriceHistory =
   () => PANELS['pricehistory'] = PriceHistoryPanel;
