import * as React from 'react';
import { DateRange, DateRangePicker } from '@/Dates';
import { PanelProps } from '@/Dashboard/Panel';
import { NetworthHistoryPanelProps } from '@/NWHistory/Panel';

const Settings: React.FC<PanelProps<NetworthHistoryPanelProps>> = p => {
   const changeRange = (range: DateRange) => p.save({ range });

   return (
      <fieldset>
         <legend>Networth History</legend>
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
