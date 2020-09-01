import * as React from 'react';
import { NetworthProps } from 'NetWorth';
import { Checkbox } from 'Form';
import { SettingsProps } from 'Dashboard/Module';
import { RelativeDate, MultiDatePicker } from 'Dates';

const Settings: React.FC<NetworthProps & SettingsProps<NetworthProps>> = p => {
   const changeValue = (showValue: boolean) => p.setData({ showValue });
   const changePrice = (showPrice: boolean) => p.setData({ showPrice });
   const changeShares = (showShares: boolean) => p.setData({ showShares });
   const changedates = (dates: RelativeDate[]) => p.setData({ dates });
   return (
      <fieldset>
         <legend>Networth</legend>
         <Checkbox
            checked={p.showValue}
            onChange={changeValue}
            text="Show values"
         />
         <Checkbox
            checked={p.showPrice}
            onChange={changePrice}
            text="Show prices"
         />
         <Checkbox
            checked={p.showShares}
            onChange={changeShares}
            text="Show shares"
         />
         <MultiDatePicker
            text="Columns"
            value={p.dates}
            onChange={changedates}
         />
      </fieldset>
   );
}
export default Settings;
