import * as React from 'react';
import Settings from '@/PriceHistory/Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import PriceGraph, { PriceGraphProps } from '@/PriceGraph';

export interface PriceHistoryPanelProps extends PanelBaseProps, PriceGraphProps {
   type: 'pricehistory';
}

const PriceHistoryPanel: React.FC<PanelProps<PriceHistoryPanelProps>> = p => {
   if (!p.props.prices.length) {
      return null;
   }
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

export const registerPriceHistory = {'pricehistory': PriceHistoryPanel};
