import * as React from 'react';
import { Checkbox } from 'Form';
import { PanelProps } from 'Dashboard/Panel';
import { DateRange, DateRangePicker } from 'Dates';
import { PriceHistoryPanelProps } from 'PriceHistory/Panel';

const Settings: React.FC<PanelProps<PriceHistoryPanelProps>> = p => {
   const changeHidePos = (show: boolean) => p.save({hidePositions: !show});
   const changeHidePrices = (show: boolean) => p.save({hidePrices: !show});
   const changeHideHold = (show: boolean) => p.save({hideHoldings: !show});
   const changeRange = (range: DateRange) => p.save({ range });

   return (
      <fieldset>
         <legend>Price History</legend>
         <Checkbox
            checked={!p.props.hidePositions}
            onChange={changeHidePos}
            text="Show positions"
         />
         <Checkbox
            checked={!p.props.hidePrices}
            onChange={changeHidePrices}
            text="Show prices"
         />
         <Checkbox
            checked={!p.props.hideHoldings}
            onChange={changeHideHold}
            text="Show holdings"
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
