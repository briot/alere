import * as React from 'react';
import Ledger, { LedgerProps } from 'Ledger';
import { AccountIdList } from 'Transaction';
import { SplitMode, TransactionMode } from 'services/usePrefs';
import { Checkbox, Select, Option } from 'Form';
import { DateRange, DateRangePicker } from 'Dates';
import { BaseProps, SettingsProps, DashboardModule } from 'Dashboard/Panels';
import { LedgerPrefs } from 'services/usePrefs';
import { SelectMultiAccount } from 'Account';

export interface LedgerPanelProps extends LedgerProps, BaseProps {
   type: 'ledger';
}

export const LedgerPrefsSettings:
   React.FC<LedgerPrefs & SettingsProps<LedgerPrefs>>
= p => {

   const changeTrans = (trans_mode: string) =>
      p.setData({ trans_mode: parseInt(trans_mode, 10) });
   const changeSplit = (split_mode: string) =>
      p.setData({ split_mode: parseInt(split_mode, 10) });
   const changeBorders = (borders: boolean) => p.setData({ borders });
   const changeExpand = (defaultExpand: boolean) => p.setData({ defaultExpand });
   const changeValueColumn = (valueColumn: boolean) =>
      p.setData({ valueColumn });
   return (
      <fieldset>
         <legend>Ledger</legend>
         <Checkbox
             checked={p.borders}
             onChange={changeBorders}
             text="Show borders"
         />
         <Checkbox
             checked={p.valueColumn}
             onChange={changeValueColumn}
             text="Deposit and paiements in same column"
         />
         <Checkbox
             checked={p.defaultExpand}
             onChange={changeExpand}
             text="Expand rows by default"
         />

         <Select
             text="Memos"
             onChange={changeTrans}
             value={p.trans_mode}
         >
             <Option
                 text="Hide memos"
                 value={TransactionMode.ONE_LINE}
             />
             <Option
                 text="Show memos if not empty"
                 value={TransactionMode.AUTO}
             />
             <Option
                 text="Show memos always"
                 value={TransactionMode.TWO_LINES}
             />
         </Select>

         <Select
             text="Splits"
             onChange={changeSplit}
             value={p.split_mode}
         >
             <Option
                 text="Never show splits"
                 value={SplitMode.HIDE}
             />
             <Option
                 text="Show summary"
                 value={SplitMode.SUMMARY}
             />
             <Option
                 text="Show if more than two accounts"
                 value={SplitMode.COLLAPSED}
             />
             <Option
                 text="Multiple rows, no duplicate"
                 value={SplitMode.OTHERS}
             />
             <Option
                 text="Multiple rows"
                 value={SplitMode.MULTILINE}
             />
         </Select>

         { /*
         <div className="option">
            <label htmlFor="ledgermode">Show details</label>
            <select
                disabled={true}
                id="ledgermode"
            >
                <option>Collapse splits</option>
                <option>Expand current split</option>
                <option>Expand all splits</option>
            </select>
         </div>
         */ }

         <Select
             text="Editing"
             disabled={true}
             value="inline"
         >
             <option>Inline</option>
             <option>Separate window</option>
         </Select>

         {p.children}
      </fieldset>
   );

}

const Settings: React.FC<LedgerProps & SettingsProps<LedgerProps>>
= p => {
   const changeRange = (range: DateRange) => p.setData({ range });
   const changeAccount =
      (a: AccountIdList | undefined) => p.setData({ accountIds: a });
   return (
      <>
         <LedgerPrefsSettings {...p} >
            <DateRangePicker
               text="Time period"
               value={p.range || 'forever'}
               onChange={changeRange}
            />
            <SelectMultiAccount
               text="Accounts"
               value={p.accountIds}
               onChange={changeAccount}
            />
         </LedgerPrefsSettings>
      </>
   );
}

const LedgerModule: DashboardModule<LedgerPanelProps> = {
   Settings,
   Content: Ledger,
}
export default LedgerModule;
