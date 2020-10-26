import * as React from 'react';
import Investments, { InvestmentsProps } from 'Investments/View';
import Settings from 'Investments/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import RoundButton from 'RoundButton';

export interface InvestmentsPanelProps extends PanelBaseProps, InvestmentsProps {
   type: 'investments';
}

const InvestmentsPanel: React.FC<PanelProps<InvestmentsPanelProps>> = p => {
   const [update, setUpdate] = React.useState(false);
   const forceUpdate = React.useCallback(
      () => setUpdate(true),
      []
   );
   return (
      <Panel
         {...p}
         header={{
            title: 'Investments',
            buttons: (
               <RoundButton
                  fa='fa-refresh'
                  size='tiny'
                  title='sync'
                  onClick={forceUpdate}
               />
            )
         }}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Investments
            {...p.props}
            fromProviders={update}
         />
      </Panel>
   );
}

export const registerInvestments =
   () => PANELS['investments'] = InvestmentsPanel;