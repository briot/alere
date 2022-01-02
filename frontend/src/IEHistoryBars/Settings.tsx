import * as React from 'react';
import { DateRange, MultiRangePicker } from '@/Dates';
import { IEHistoryBarsPanelProps } from '@/IEHistoryBars/Panel';
import { PanelProps } from '@/Dashboard/Panel';

const Settings: React.FC<PanelProps<IEHistoryBarsPanelProps>> = p => {
   const changeRange = (ranges: DateRange[]) => p.save({ ranges });
   return (
      <>
         <fieldset>
            <legend>Income/Expense History Bars</legend>
            <MultiRangePicker
               text="Columns"
               value={p.props.ranges}
               onChange={changeRange}
            />
         </fieldset>
      </>
   );
}
export default Settings;

