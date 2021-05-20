import * as React from 'react';
import { DateRange, DateRangePicker } from '@/Dates';
import { InvestmentsPanelProps } from '@/Investments/Panel';
import { Checkbox } from '@/Form';
import { PanelProps } from '@/Dashboard/Panel';

const Settings: React.FC<PanelProps<InvestmentsPanelProps>> = p => {
   const changeHide = (hideIfNoShare: boolean) => p.save?.({ hideIfNoShare });
   const changeWA = (showWALine: boolean) => p.save?.({ showWALine });
   const changeAC = (showACLine: boolean) => p.save?.({ showACLine });
   const changeRange = (range: DateRange) => p.save({ range });
   const changeROIGraph = (s: boolean) => p.save({ hideROIGraph: !s });
   const changePriceGraph = (s: boolean) => p.save({ hidePriceGraph: !s });
   return (
      <fieldset>
         <legend>Investments</legend>
         <Checkbox
             checked={p.props.hideIfNoShare ?? false}
             onChange={changeHide}
             text="Hide no longer traded stocks"
         />
         <Checkbox
             checked={!p.props.hidePriceGraph}
             onChange={changePriceGraph}
             text="Show Price graph"
         />
         <Checkbox
             checked={!p.props.hideROIGraph}
             onChange={changeROIGraph}
             text="Show ROI graph"
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
