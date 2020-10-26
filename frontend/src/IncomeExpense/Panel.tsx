import * as React from 'react';
import IncomeExpense, { IncomeExpenseProps } from 'IncomeExpense/View';
import Settings from 'IncomeExpense/Settings';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import { rangeDisplay } from 'Dates';

export interface IncomeExpensePanelProps
   extends PanelBaseProps, IncomeExpenseProps {
   type: 'incomeexpenses';
}

const IEPanel: React.FC<PanelProps<IncomeExpensePanelProps>> = p => {
   const basetitle = p.props.expenses ? 'Expenses': 'Income';
   return (
      <Panel
         {...p}
         header={{ title: `${basetitle} ${rangeDisplay(p.props.range)}`}}
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
