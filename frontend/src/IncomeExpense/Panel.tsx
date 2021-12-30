import * as React from 'react';
import IncomeExpense, { IncomeExpenseProps } from '@/IncomeExpense/View';
import Settings from '@/IncomeExpense/Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import useAccounts from '@/services/useAccounts';

export interface IncomeExpensePanelProps
   extends PanelBaseProps, IncomeExpenseProps {
   type: 'incomeexpenses';
}

const IEPanel: React.FC<PanelProps<IncomeExpensePanelProps>> = p => {
   const { accounts } = useAccounts();
   if (!accounts.has_accounts()) {
      return null;
   }

   return (
      <Panel
         {...p}
         header={{ name: p.props.expenses ? 'expenses': 'income',
                   range: p.props.range }}
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

const registerIE = {'incomeexpenses': IEPanel};
export default registerIE;
