import * as React from 'react';
import { DateRange, DateRangePicker } from '@/Dates';
import { PanelProps } from '@/Dashboard/Panel';
import { NetworthHistoryPanelProps } from '@/NWHistory/Panel';
import { GroupBy, groupByOptions } from '@/NWHistory/View';
import { Checkbox, Select } from '@/Form';


const Settings: React.FC<PanelProps<NetworthHistoryPanelProps>> = p => {
   const changeRange = (range: DateRange) => p.save({ range });
   const changeLegend = (show: boolean) => p.save({ hideLegend: !show });
   const changeGroup = (groupBy: GroupBy) => p.save({ groupBy });
   const changeScheduled =
      (includeScheduled: boolean) => p.save({ includeScheduled });

   return (
      <fieldset>
         <legend>Networth History</legend>
         <Checkbox
            value={!p.props.hideLegend}
            onChange={changeLegend}
            text="Show legend"
         />
         <Checkbox
            value={!!p.props.includeScheduled}
            onChange={changeScheduled}
            text="Include scheduled transactions"
         />
         {
            !p.excludeFields?.includes("range") &&
            <DateRangePicker
               text="Time period"
               value={p.props.range || 'forever'}
               onChange={changeRange}
            />
         }
         <Select
            text="Group by"
            value={p.props.groupBy || 'months'}
            onChange={changeGroup}
            options={groupByOptions}
         />
      </fieldset>
   );
}
export default Settings;
