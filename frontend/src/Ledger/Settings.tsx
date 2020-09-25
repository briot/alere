import * as React from 'react';
import { BaseLedgerProps, SplitMode, NotesMode } from 'Ledger';
import { Checkbox, Select } from 'Form';
import { DateRange, DateRangePicker } from 'Dates';
import { SettingsProps } from 'Dashboard/Module';
import { Account, AccountIdList } from 'services/useAccounts';
import { SelectMultiAccount } from 'Account';
import useAccountIds from 'services/useAccountIds';

const Settings: React.FC<BaseLedgerProps & SettingsProps<BaseLedgerProps>>
= p => {
   const allAccounts = useAccountIds(p.accountIds);

   const changeRange = (range: DateRange) => p.setData({ range });
   const changeAccount =
      (accountIds: AccountIdList) => p.setData({ accountIds });
   const changeTrans = (notes_mode: NotesMode) => p.setData({notes_mode});
   const changeSplit = (split_mode: SplitMode) => p.setData({ split_mode });
   const changeBorders = (borders: boolean) => p.setData({ borders });
   const changeAlt = (alternateColors: boolean) => p.setData({ alternateColors });
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
             checked={p.alternateColors}
             onChange={changeAlt}
             text="Alternate background color"
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
             value={p.notes_mode}
             options={[
                {text: "Hide memos",              value: NotesMode.ONE_LINE},
                {text: "Show memos if not empty", value: NotesMode.AUTO},
                {text: "Show memos always",       value: NotesMode.TWO_LINES},
                {text: "Separate column",         value: NotesMode.COLUMN},
            ]}
         />

         <Select
             text="Splits"
             onChange={changeSplit}
             value={p.split_mode}
             options={[
                {text: "Never show splits",              value: SplitMode.HIDE},
                {text: "Show summary",                   value: SplitMode.SUMMARY},
                {text: "Show if more than two accounts", value: SplitMode.COLLAPSED},
                {text: "Multiple rows, no duplicate",    value: SplitMode.OTHERS},
                {text: "Multiple rows",               value: SplitMode.MULTILINE},
             ]}
         />

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
             value="Inline"
             options={[
                {value: "Inline"},
                {value: "Separate window"},
             ]}
         />

         {
            !p.excludeFields?.includes("range") &&
            <DateRangePicker
               text="Time period"
               value={p.range || 'forever'}
               onChange={changeRange}
            />
         }
         {
            !p.excludeFields?.includes("accountIds") &&
            <SelectMultiAccount
               text="Accounts"
               value={allAccounts as Account[]|undefined}
               onChange={changeAccount}
            />
         }
      </fieldset>
   );
}
export default Settings;
