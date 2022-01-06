import * as React from 'react';
import { DateRange, DateRangePicker } from '@/Dates';
import { PanelProps } from '@/Dashboard/Panel';
import { NetworthHistoryPanelProps } from '@/NWHistory/Panel';
import { Checkbox } from '@/Form';

const Settings: React.FC<PanelProps<NetworthHistoryPanelProps>> = p => {
   const changeRange = (range: DateRange) => p.save({ range });
   const changeLegend = (show: boolean) => p.save({ hideLegend: !show });

   return (
      <fieldset>
         <legend>Networth History</legend>
         <Checkbox
            value={!p.props.hideLegend}
            onChange={changeLegend}
            text="Show legend"
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
