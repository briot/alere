import * as React from 'react';
import { DateRangePicker, DateRange } from 'Dates';
import { CashflowProps } from 'Cashflow';
import { SettingsProps } from 'Dashboard/Module';

const Settings: React.FC<
   CashflowProps & SettingsProps<CashflowProps>
> = p => {
   const changeRange = (range: DateRange) => p.setData({ range });
   return (
      <fieldset>
         <legend>Income and Expenses</legend>
         <DateRangePicker
            text="Time period"
            value={p.range}
            onChange={changeRange}
         />
      </fieldset>
   );
}
export default Settings;

