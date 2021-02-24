import * as React from 'react';
import { DateRange, DateRangePicker } from 'Dates';
import { InvestmentsPanelProps } from 'Investments/Panel';
import { Checkbox } from 'Form';
import { PanelProps } from 'Dashboard/Panel';

const Settings: React.FC<PanelProps<InvestmentsPanelProps>> = p => {
   const changeHide = (hideIfNoShare: boolean) => p.save?.({ hideIfNoShare });
   const changeWA = (showWALine: boolean) => p.save?.({ showWALine });
   const changeAC = (showACLine: boolean) => p.save?.({ showACLine });
   const changeTable = (asTable: boolean) => p.save?.({ asTable });
   const changeRange = (range: DateRange) => p.save({ range });
   return (
      <fieldset>
         <legend>Investments</legend>
         <Checkbox
             checked={p.props.asTable ?? false}
             onChange={changeTable}
             text="Show as table"
         />
         <Checkbox
             checked={p.props.hideIfNoShare ?? false}
             onChange={changeHide}
             text="Hide no longer traded stocks"
         />
         <Checkbox
             checked={p.props.showWALine ?? false}
             onChange={changeWA}
             text="Show Weighted Average lines in graphs"
         />
         <Checkbox
             checked={p.props.showACLine ?? false}
             onChange={changeAC}
             text="Show Average Cost lines in graphs"
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
