import * as React from 'react';
import Cashflow, { CashflowProps } from '@/Cashflow/View';
import Settings from '@/Cashflow/Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';

export interface CashflowPanelProps extends PanelBaseProps, CashflowProps {
   type: 'cashflow';
}

const CashflowPanel: React.FC<PanelProps<CashflowPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ name: 'cashflow' }}
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

export const registerCashflow = {'cashflow': CashflowPanel};
