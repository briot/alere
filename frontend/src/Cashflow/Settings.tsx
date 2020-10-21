import * as React from 'react';
import { DateRangePicker, DateRange } from 'Dates';
import { CashflowPanelProps } from 'Cashflow/Panel';
import { PanelProps } from 'Dashboard/Panel';

const Settings: React.FC<PanelProps<CashflowPanelProps>> = p => {
   const changeRange = (range: DateRange) => p.save({ range });
   return (
      <fieldset>
         <legend>Income and Expenses</legend>
         <DateRangePicker
            text="Time period"
            value={p.props.range}
            onChange={changeRange}
         />
      </fieldset>
   );
}
export default Settings;

