import * as React from 'react';
import { DateRangePicker, DateRange } from '@/Dates';
import { IncomeExpensePanelProps } from '@/IncomeExpense/Panel';
import { Checkbox } from '@/Form';
import { PanelProps } from '@/Dashboard/Panel';

const Settings: React.FC<PanelProps<IncomeExpensePanelProps>> = p => {
   const changeExp   = (expenses: boolean) => p.save({ expenses });
   const changeRange = (range: DateRange) => p.save({ range });
   const changeRound = (roundValues: boolean) => p.save({ roundValues });
   const changeBars = (showBars: boolean) => p.save({ showBars });
   return (
      <fieldset>
         <legend>Income and Expenses</legend>
         <Checkbox
            checked={p.props.expenses}
            onChange={changeExp}
            text="Show expenses"
         />
         <Checkbox
            checked={p.props.roundValues}
            onChange={changeRound}
            text="Round values"
         />
         <Checkbox
            checked={p.props.showBars}
            onChange={changeBars}
            text="Bar chart"
         />
         <DateRangePicker
            text="Time period"
            value={p.props.range}
            onChange={changeRange}
         />
      </fieldset>
   );
}
export default Settings;
