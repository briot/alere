import * as React from 'react';
import { DateRange, MultiRangePicker } from '@/Dates';
import { IEHistoryPanelProps } from '@/IEHistory/Panel';
import { PanelProps } from '@/Dashboard/Panel';
import { Checkbox, Select } from '@/Form';
import { TreeMode } from '@/services/useAccountTree';
import { TablePrefs, TableSettings } from '@/List/ListPrefs';

const Settings: React.FC<PanelProps<IEHistoryPanelProps>> = p => {
   const changeRound = (roundValues: boolean) => p.save({ roundValues });
   const changeRange = (ranges: DateRange[]) => p.save({ ranges });
   const changeTreeMode = (treeMode: TreeMode) => p.save({ treeMode });
   const changeTablePrefs = (tablePrefs: TablePrefs) => p.save({ tablePrefs });
   return (
      <>
         <fieldset>
            <legend>Income/Expense History</legend>
            <Checkbox
               value={p.props.roundValues}
               onChange={changeRound}
               text="Round values"
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
            <MultiRangePicker
               text="Columns"
               value={p.props.ranges}
               onChange={changeRange}
            />
         </fieldset>
         <TableSettings {...p.props.tablePrefs} save={changeTablePrefs} />
      </>
   );
}
export default Settings;

