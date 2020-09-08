import * as React from 'react';
import { BaseLedgerProps, SplitMode, TransactionMode } from 'Ledger';
import { Checkbox, Select } from 'Form';
import { DateRange, DateRangePicker } from 'Dates';
import { SettingsProps } from 'Dashboard/Module';
import { Account } from 'services/useAccounts';
import { SelectMultiAccount } from 'Account';
import useAccounts from 'services/useAccounts';

const Settings: React.FC<BaseLedgerProps & SettingsProps<BaseLedgerProps>>
= p => {
   const { accounts } = useAccounts();
   const allAccounts =
      p.accountIds
      ? p.accountIds
         .map(a => accounts.getAccount(a))
         .filter(a => a !== undefined)
      : undefined;

   const changeRange = (range: DateRange) => p.setData({ range });
   const changeAccount =
      (a: Account[] | undefined) => p.setData({
         accountIds: a ? a.map(b => b.id) : undefined,
      });
   const changeTrans = (trans_mode: TransactionMode) => p.setData({trans_mode});
   const changeSplit = (split_mode: SplitMode) => p.setData({ split_mode });
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
             options={[
                {text: "Hide memos",              value: TransactionMode.ONE_LINE},
                {text: "Show memos if not empty", value: TransactionMode.AUTO},
                {text: "Show memos always",       value: TransactionMode.TWO_LINES},
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
