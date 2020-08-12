import * as React from 'react';
import Ledger, { LedgerProps } from 'Ledger';
import { DateRange, DateRangePicker } from 'Dates';
import { BaseProps, SettingsProps, DashboardModule } from 'Dashboard/Panels';

export interface LedgerPanelProps extends LedgerProps, BaseProps {
   type: 'ledger';
}

const Settings: React.FC<SettingsProps<LedgerPanelProps>> = p => {
   const changeRange = (range: DateRange) => p.setData({ range });
   return (
      <fieldset>
         <legend>Ledger</legend>
         <DateRangePicker
            text="Time period"
            value={p.data.range || 'forever'}
            onChange={changeRange}
         />
      </fieldset>
   );
}

const LedgerModule: DashboardModule<LedgerPanelProps> = {
   Settings,
   Content: Ledger,
}
export default LedgerModule;
