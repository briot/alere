import * as React from 'react';
import { Checkbox } from 'Form';
import { SettingsProps } from 'Dashboard/Module';
import { AccountIdSet } from 'services/useAccountIds';
import { DateRange, DateRangePicker } from 'Dates';

export interface BasePriceHistoryProps {
   accountIds: AccountIdSet;  // Nothing shown if undefined
   range?: DateRange|undefined   // undefined, to see forever
   hidePositions?: boolean;
   hidePrices?: boolean;
   hideHoldings?: boolean;
}

const Settings: React.FC<
   BasePriceHistoryProps & SettingsProps<BasePriceHistoryProps>
> = p => {
   const changeHidePos = (show: boolean) => p.setData({hidePositions: !show});
   const changeHidePrices = (show: boolean) => p.setData({hidePrices: !show});
   const changeHideHold = (show: boolean) => p.setData({hideHoldings: !show});
   const changeRange = (range: DateRange) => p.setData({ range });

   return (
      <fieldset>
         <legend>Price History</legend>
         <Checkbox
            checked={!p.hidePositions}
            onChange={changeHidePos}
            text="Show positions"
         />
         <Checkbox
            checked={!p.hidePrices}
            onChange={changeHidePrices}
            text="Show prices"
         />
         <Checkbox
            checked={!p.hideHoldings}
            onChange={changeHideHold}
            text="Show holdings"
         />
         {
            !p.excludeFields?.includes("range") &&
            <DateRangePicker
               text="Time period"
               value={p.range || 'forever'}
               onChange={changeRange}
            />
         }
      </fieldset>
   );
}
export default Settings;
