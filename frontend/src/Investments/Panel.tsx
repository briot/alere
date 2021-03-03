import * as React from 'react';
import { rangeDisplay } from 'Dates';
import Investments, { InvestmentsProps } from 'Investments/View';
import Settings from 'Investments/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';

export interface InvestmentsPanelProps extends PanelBaseProps, InvestmentsProps {
   type: 'investments';
}

const InvestmentsPanel: React.FC<PanelProps<InvestmentsPanelProps>> = p => {
   const r = rangeDisplay(p.props.range);
   return (
      <Panel
         {...p}
         className={p.props.asTable ? 'astable' : 'asgrid'}
         header={{
            name: `Investments (${r.possessive} performance)`,
         }}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Investments {...p.props} />
      </Panel>
   );
}

export const registerInvestments =
   () => PANELS['investments'] = InvestmentsPanel;
