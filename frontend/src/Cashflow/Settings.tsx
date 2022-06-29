import * as React from 'react';
import { DateRange, MultiRangePicker } from '@/Dates';
import { CashflowPanelProps } from '@/Cashflow/Panel';
import { PanelProps } from '@/Dashboard/Panel';
import { Checkbox } from '@/Form';

const Settings: React.FC<PanelProps<CashflowPanelProps>> = p => {
   const changeRound = (roundValues: boolean) => p.save({ roundValues });
   const changeRange = (ranges: DateRange[]) => p.save({ ranges });
   return (
      <fieldset>
         <legend>Cashflow</legend>
         <Checkbox
            value={p.props.roundValues}
            onChange={changeRound}
            text="Round values"
         />
         <MultiRangePicker
            text="Columns"
            value={p.props.ranges}
            onChange={changeRange}
         />
      </fieldset>
   );
}
export default Settings;

