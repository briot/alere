import * as React from 'react';
import { NetworthPanelProps } from '@/NetWorth/Panel';
import { Checkbox, NumberInput, Select } from '@/Form';
import { RelativeDate, MultiDatePicker } from '@/Dates';
import { TreeMode } from '@/services/useAccountTree';
import { PanelProps } from '@/Dashboard/Panel';

const Settings: React.FC<PanelProps<NetworthPanelProps>> = p => {
   const changeValue = (showValue: boolean) => p.save({ showValue });
   const changePrice = (showPrice: boolean) => p.save({ showPrice });
   const changeShares = (showShares: boolean) => p.save({ showShares });
   const changePercent = (showPercent: boolean) => p.save({ showPercent });
   const changeDeltaL = (showDeltaLast: boolean) => p.save({ showDeltaLast });
   const changeDeltaN = (showDeltaNext: boolean) => p.save({ showDeltaNext });
   const changedates = (dates: RelativeDate[]) => p.save({ dates });
   const changeBorders = (borders: boolean) => p.save({ borders });
   const changeThreshold = (threshold: number) => p.save({ threshold });
   const changeAlt = (alternateColors: boolean) => p.save({ alternateColors });
   const changeTreeMode = (treeMode: TreeMode) => p.save({ treeMode });
   const changeRound = (roundValues: boolean) => p.save({ roundValues });
   const changeExpandTrading = (expandTradingAccounts: boolean) =>
      p.save({ expandTradingAccounts });
   return (
      <fieldset>
         <legend>Networth</legend>
         <Checkbox
             value={p.props.borders}
             onChange={changeBorders}
             text="Show borders"
         />
         <Checkbox
             value={p.props.alternateColors}
             onChange={changeAlt}
             text="Alternate background color"
         />
         <Checkbox
            value={p.props.showValue}
            onChange={changeValue}
            text="Show values"
         />
         <Checkbox
            value={p.props.showPrice}
            onChange={changePrice}
            text="Show prices"
         />
         <Checkbox
            value={p.props.showShares}
            onChange={changeShares}
            text="Show shares"
         />
         <Checkbox
            value={p.props.showPercent}
            onChange={changePercent}
            text="Show percent of total"
         />
         <Checkbox
            value={p.props.showDeltaNext}
            onChange={changeDeltaN}
            text="Show delta with next column"
         />
         <Checkbox
            value={p.props.showDeltaLast}
            onChange={changeDeltaL}
            text="Show delta with last column"
         />
         <Checkbox
            value={p.props.expandTradingAccounts}
            onChange={changeExpandTrading}
            text="Expand Investment accounts"
         />
         <Checkbox
            value={p.props.roundValues}
            onChange={changeRound}
            text="Round values"
         />
         <NumberInput
            value={p.props.threshold ?? 0}
            onChange={changeThreshold}
            required={true}
            text="Threshold"
            title="Hide accounts with a value below this threshold"
         />
         <Select
             text="Group by"
             onChange={changeTreeMode}
             value={p.props.treeMode}
             options={[
                {text: "Flat list",      value: TreeMode.FLAT},
                {text: "Parent account", value: TreeMode.USER_DEFINED},
                {text: "Account type",   value: TreeMode.ACCOUNT_TYPE},
                {text: "Institution",    value: TreeMode.INSTITUTION},
            ]}
         />

         <MultiDatePicker
            text="Columns"
            value={p.props.dates}
            onChange={changedates}
         />
      </fieldset>
   );
}
export default Settings;
