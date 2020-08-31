import * as React from 'react';
import { DateRangePicker, DateRange } from 'Dates';
import CategoryPie, { PiePlotProps } from 'Plots/CategoryPie';
import { BaseProps, SettingsProps, DashboardModule } from 'Dashboard/Module';
import { Checkbox } from 'Form';

export interface IncomeExpensesProps extends PiePlotProps, BaseProps {
   type: 'incomeexpenses';
}

const Settings: React.FC<PiePlotProps & SettingsProps<PiePlotProps>> = p => {
   const changeExp   = (expenses: boolean) => p.setData({ expenses });
   const changeRange = (range: DateRange) => p.setData({ range });
   return (
      <fieldset>
         <legend>Income and Expenses</legend>
         <Checkbox
            checked={p.expenses}
            onChange={changeExp}
            text="Show expenses"
         />
         <DateRangePicker
            text="Time period"
            value={p.range}
            onChange={changeRange}
         />
      </fieldset>
   );
}

const IncomeExpensesModule: DashboardModule<IncomeExpensesProps> = {
   Settings,
   Content: CategoryPie,
}
export default IncomeExpensesModule;
