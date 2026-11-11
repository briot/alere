import * as React from 'react';
import { DateRange, MultiRangePicker } from '@/Dates';
import { IEHistoryBarsPanelProps } from '@/IEHistoryBars/Panel';
import { PanelProps } from '@/Dashboard/Panel';
import { SelectMultiAccount } from '@/Account/SelectMultiAccount';
import { AccountIdSet } from '@/services/useAccountIds';

const Settings: React.FC<PanelProps<IEHistoryBarsPanelProps>> = p => {
   const { save } = p;
   const changeRange = React.useCallback(
      (ranges: DateRange[]) => save({ ranges }),
      [save]
   );
   const changeIds = React.useCallback(
      (accountIds: AccountIdSet) => save({ accountIds }),
      [save]
   );
   return (
      <>
         <fieldset>
            <legend>Income/Expense History Bars</legend>
            <MultiRangePicker
               text="Columns"
               value={p.props.ranges}
               onChange={changeRange}
            />
            <SelectMultiAccount
               text="Accounts"
               value={p.props.accountIds}
               onChange={changeIds}
               hidden='networth'
            />
         </fieldset>
      </>
   );
}
export default Settings;

