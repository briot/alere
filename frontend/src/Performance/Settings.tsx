import * as React from 'react';
import { DateRange, DateRangePicker } from '@/Dates';
import { PerformancePanelProps } from '@/Performance/Panel';
import { Checkbox } from '@/Form';
import { PanelProps } from '@/Dashboard/Panel';

const Settings: React.FC<PanelProps<PerformancePanelProps>> = p => {
   const changeHide = (hideIfNoShare: boolean) => p.save?.({ hideIfNoShare });
   const changeRange = (range: DateRange) => p.save({ range });
   return (
      <fieldset>
         <legend>Performance</legend>
         <Checkbox
             checked={p.props.hideIfNoShare ?? false}
             onChange={changeHide}
             text="Hide no longer traded stocks"
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
