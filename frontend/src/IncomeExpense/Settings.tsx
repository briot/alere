import * as React from 'react';
import { DateRangePicker, DateRange } from 'Dates';
import { IncomeExpenseProps } from 'IncomeExpense';
import { SettingsProps } from 'Dashboard/Module';
import { Checkbox } from 'Form';

const Settings: React.FC<
   IncomeExpenseProps & SettingsProps<IncomeExpenseProps>
> = p => {
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
export default Settings;
