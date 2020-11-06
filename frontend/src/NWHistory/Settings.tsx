import * as React from 'react';
import { DateRange, DateRangePicker } from 'Dates';
import { NumberInput } from 'Form';
import { PanelProps } from 'Dashboard/Panel';
import { NetworthHistoryPanelProps } from 'NWHistory/Panel';

const Settings: React.FC<PanelProps<NetworthHistoryPanelProps>> = p => {
   const changeRange = (range: DateRange) => p.save({ range });
   const changePrior = (prior: number) => p.save({ prior });
   const changeAfter = (after: number) => p.save({ after });

   return (
      <fieldset>
         <legend>Networth History</legend>
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
