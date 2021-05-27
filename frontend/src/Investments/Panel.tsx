import * as React from 'react';
import Investments, { InvestmentsProps } from '@/Investments/View';
import Settings from '@/Investments/Settings';
import Panel, { PanelProps, PanelBaseProps,} from '@/Dashboard/Panel';

export interface InvestmentsPanelProps extends PanelBaseProps, InvestmentsProps {
   type: 'investments';
}

const InvestmentsPanel: React.FC<PanelProps<InvestmentsPanelProps>> = p => {
   return (
      <Panel
         {...p}
         className='asgrid'
         header={{name: 'investments', range: p.props.range}}
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

export const registerInvestments = {'investments': InvestmentsPanel};
