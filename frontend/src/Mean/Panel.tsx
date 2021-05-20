import * as React from 'react';
import Mean, { MeanProps } from '@/Mean/View';
import Settings from '@/Mean/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from '@/Dashboard/Panel';
import { rangeDisplay } from '@/Dates';
import { capitalize } from '@/services/utils';
import useAccounts from '@/services/useAccounts';

export interface MeanPanelProps extends PanelBaseProps, MeanProps {
   type: 'mean';
}

const MeanPanel: React.FC<PanelProps<MeanPanelProps>> = p => {
   const r = rangeDisplay(p.props.range);
   const title = [
      p.props.showExpenses ? 'expenses' : undefined,
      p.props.showIncome ? 'income' : undefined,
   ].filter(v => v !== undefined).join(' and ');

   const { accounts } = useAccounts();
   if (!accounts.has_accounts()) {
      return null;
   }

   return (
      <Panel
         {...p}
         header={{name: capitalize(`${r.possessive}${title} history`),
                  tooltip: r.as_dates}}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Mean {...p.props} />
      </Panel>
   );
}

export const registerMean = () => PANELS['mean'] = MeanPanel;
