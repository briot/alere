import * as React from 'react';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import TickerView, { TickerViewProps } from './View';

export interface TickerPanelProps extends PanelBaseProps, TickerViewProps {
   type: 'ticker';
}

const TickerPanel: React.FC<PanelProps<TickerPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{title: p.props.ticker.name}}
         Settings={null  /* no menu at all */}
      >
         <TickerView {...p.props} />
      </Panel>
   );
}
export default TickerPanel;
export const registerTicker = () => PANELS['ticker'] = TickerPanel;
