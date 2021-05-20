import * as React from 'react';
import Cashflow, { CashflowProps } from '@/Cashflow/View';
import Settings from '@/Cashflow/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from '@/Dashboard/Panel';
import { rangeDisplay } from '@/Dates';
import { capitalize } from '@/services/utils';

export interface CashflowPanelProps extends PanelBaseProps, CashflowProps {
   type: 'metrics';
}

const CashflowPanel: React.FC<PanelProps<CashflowPanelProps>> = p => {
   const r = rangeDisplay(p.props.range);
   return (
      <Panel
         {...p}
         header={{ name: capitalize(`${r.possessive}metrics`),
                   tooltip: r.as_dates}}
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
