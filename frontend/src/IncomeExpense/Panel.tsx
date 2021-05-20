import * as React from 'react';
import IncomeExpense, { IncomeExpenseProps } from '@/IncomeExpense/View';
import Settings from '@/IncomeExpense/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from '@/Dashboard/Panel';
import { rangeDisplay } from '@/Dates';
import { capitalize } from '@/services/utils';
import useAccounts from '@/services/useAccounts';

export interface IncomeExpensePanelProps
   extends PanelBaseProps, IncomeExpenseProps {
   type: 'incomeexpenses';
}

const IEPanel: React.FC<PanelProps<IncomeExpensePanelProps>> = p => {
   const basetitle = p.props.expenses ? 'expenses': 'income';
   const r = rangeDisplay(p.props.range);

   const { accounts } = useAccounts();
   if (!accounts.has_accounts()) {
      return null;
   }

   return (
      <Panel
         {...p}
         header={{ name: capitalize(`${r.possessive}${basetitle}`),
                   tooltip: r.as_dates}}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <IncomeExpense {...p.props} />
      </Panel>
   );
}

export const registerIE = () => PANELS['incomeexpenses'] = IEPanel;

