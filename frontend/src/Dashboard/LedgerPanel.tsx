import * as React from 'react';
import Ledger, { LedgerProps } from 'Ledger';
import { BaseProps, SettingsProps, DashboardModule } from 'Dashboard/Panels';

export interface LedgerPanelProps extends LedgerProps, BaseProps {
   type: 'ledger';
}

const Settings: React.FC<SettingsProps<LedgerPanelProps>> = p => {
   return null;
//   const changeExp   = (expenses: boolean) => p.setData({ expenses });
//   const changeRange = (range: DateRange) => p.setData({ range });
//   return (
//      <fieldset>
//         <legend>Income and Expenses</legend>
//         <Checkbox
//            checked={p.data.expenses}
//            onChange={changeExp}
//            text="Show expenses"
//         />
//         <DateRangePicker
//            text="Time period"
//            value={p.data.range}
//            onChange={changeRange}
//         />
//      </fieldset>
//   );
}

const LedgerModule: DashboardModule<LedgerPanelProps> = {
   Settings,
   Content: Ledger,
}
export default LedgerModule;
