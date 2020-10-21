import * as React from 'react';
import { DateRange, DateRangePicker } from 'Dates';
import { Checkbox, NumberInput } from 'Form';
import { PanelProps } from 'Dashboard/Panel';
import { MeanPanelProps } from 'Mean/Panel';

const Settings: React.FC<PanelProps<MeanPanelProps>> = p => {
   const changeRange = (range: DateRange) => p.save({ range });
   const changePrior = (prior: number) => p.save({ prior });
   const changeAfter = (after: number) => p.save({ after });
   const changeExp   = (expenses: boolean) => p.save({ expenses });

   return (
      <fieldset>
         <legend>Expenses History</legend>
         <Checkbox
            checked={p.props.expenses}
            onChange={changeExp}
            text="Show expenses"
         />
         <NumberInput
            value={p.props.prior}
            text="Months before"
            title="How many months before the date to use, when computing averages"
            onChange={changePrior}
         />
         <NumberInput
            value={p.props.after}
            text="Months after"
            title="How many months after the date to use, when computing averages"
            onChange={changeAfter}
         />
         {
            !p.excludeFields?.includes("range") &&
            <DateRangePicker
               text="Time period"
               value={p.props.range || 'forever'}
               onChange={changeRange}
            />
         }
      </fieldset>
   );
}
export default Settings;
