import * as React from 'react';
import Cashflow, { CashflowProps } from 'Cashflow/View';
import Settings from 'Cashflow/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import { rangeDisplay } from 'Dates';

export interface CashflowPanelProps extends PanelBaseProps, CashflowProps {
   type: 'metrics';
}

const CashflowPanel: React.FC<PanelProps<CashflowPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ title: `Metrics ${rangeDisplay(p.props.range)}`}}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Cashflow {...p.props} />
      </Panel>
   );
}

export const registerCashflow = () => PANELS['metrics'] = CashflowPanel;
