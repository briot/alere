import * as React from 'react';
import { NetworthProps } from 'NetWorth';
import { Checkbox, NumberInput, Select } from 'Form';
import { SettingsProps } from 'Dashboard/Module';
import { RelativeDate, MultiDatePicker } from 'Dates';
import { TreeMode } from 'services/useAccountTree';

const Settings: React.FC<NetworthProps & SettingsProps<NetworthProps>> = p => {
   const changeValue = (showValue: boolean) => p.setData({ showValue });
   const changePrice = (showPrice: boolean) => p.setData({ showPrice });
   const changeShares = (showShares: boolean) => p.setData({ showShares });
   const changedates = (dates: RelativeDate[]) => p.setData({ dates });
   const changeThreshold = (threshold: number) => p.setData({ threshold });
   const changeAlt = (alternateColors: boolean) => p.setData({ alternateColors });
   const changeTreeMode = (treeMode: TreeMode) => p.setData({ treeMode });
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
         <Checkbox
             checked={p.alternateColors}
             onChange={changeAlt}
             text="Alternate background color"
         />
         <NumberInput
            value={p.threshold ?? 0}
            onChange={changeThreshold}
            required={true}
            text="Threshold"
            title="Hide accounts with a value below this threshold"
         />
         <Select
             text="Group by"
             onChange={changeTreeMode}
             value={p.treeMode}
             options={[
                {text: "Flat list",      value: TreeMode.FLAT},
                {text: "Parent account", value: TreeMode.USER_DEFINED},
                {text: "Account type",   value: TreeMode.ACCOUNT_TYPE},
                {text: "Institution",    value: TreeMode.INSTITUTION},
            ]}
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
