import * as React from 'react';
import { SplitMode, NotesMode } from '@/Ledger/View';
import { LedgerPanelProps } from '@/Ledger/Panel';
import { Checkbox, Select } from '@/Form';
import { DateRange, DateRangePicker } from '@/Dates';
import { Account } from '@/services/useAccounts';
import { AccountIdSet } from '@/services/useAccountIds';
import { SelectMultiAccount } from '@/Account/SelectMultiAccount';
import useAccountIds from '@/services/useAccountIds';
import { PanelProps } from '@/Dashboard/Panel';
import { TableSettings } from '@/List/ListPrefs';

const Settings: React.FC<PanelProps<LedgerPanelProps>> = p => {
   const { accounts: allAccounts } = useAccountIds(p.props.accountIds);

   const changeRange = (range: DateRange) => p.save({ range });
   const changeAccount = (accountIds: AccountIdSet) => p.save({ accountIds });
   const changeTrans = (notes_mode: NotesMode) => p.save({notes_mode});
   const changeSplit = (split_mode: SplitMode) => p.save({ split_mode });
   const changeExpand = (defaultExpand: boolean) => p.save({ defaultExpand });
   const changeValueColumn = (valueColumn: boolean) => p.save({ valueColumn });
   const changeRestrict = (restrictExpandArrow: boolean) =>
      p.save({ restrictExpandArrow });

   return (
   <>
      <fieldset>
         <legend>Ledger</legend>
         <Checkbox
             value={p.props.valueColumn}
             onChange={changeValueColumn}
             text="Deposit and paiements in same column"
         />
         <Checkbox
             value={p.props.defaultExpand}
             onChange={changeExpand}
             text="Expand rows by default"
         />
         <Checkbox
             value={p.props.restrictExpandArrow}
             onChange={changeRestrict}
             text="Hide arrow if only 2 splits"
         />

         <Select
             text="Memos"
             onChange={changeTrans}
             value={p.props.notes_mode}
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
             value={p.props.split_mode}
             options={[
                {text: "Never show splits",           value: SplitMode.HIDE},
                {text: "Show summary",                value: SplitMode.SUMMARY},
                {text: "Multiple rows",               value: SplitMode.COLLAPSED},
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
               value={p.props.range ?? 'all'}
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
      <TableSettings {...p} />
   </>
   );
}
export default Settings;
