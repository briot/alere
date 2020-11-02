import * as React from 'react';
import { DateRangePicker, DateRange } from 'Dates';
import { CashflowPanelProps } from 'Cashflow/Panel';
import { PanelProps } from 'Dashboard/Panel';
import { Checkbox } from 'Form';

const Settings: React.FC<PanelProps<CashflowPanelProps>> = p => {
   const changeRange = (range: DateRange) => p.save({ range });
   const changeRound = (roundValues: boolean) => p.save({ roundValues });
   return (
      <fieldset>
         <legend>Income and Expenses</legend>
         <DateRangePicker
            text="Time period"
            value={p.props.range}
            onChange={changeRange}
         />
         <Checkbox
            checked={p.props.roundValues}
            onChange={changeRound}
            text="Round values"
         />
      </fieldset>
   );
}
export default Settings;

