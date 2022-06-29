import * as React from 'react';
import { DateRange, MultiRangePicker } from '@/Dates';
import { IEHistoryPanelProps } from '@/IEHistory/Panel';
import { PanelProps } from '@/Dashboard/Panel';
import { Checkbox } from '@/Form';
import { TreeMode, SelectTreeMode } from '@/services/TreeMode';
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
            <SelectTreeMode
               treeMode={p.props.treeMode}
               onChange={changeTreeMode}
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

