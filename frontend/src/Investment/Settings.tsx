import * as React from 'react';
import { InvestmentsPanelProps } from 'Investment/Panel';
import { Checkbox } from 'Form';
import { SettingsProps } from 'Dashboard/Module';

const Settings: React.FC<
   InvestmentsPanelProps & SettingsProps<InvestmentsPanelProps>
> = p => {
   const changeHide = (hideIfNoShare: boolean) => p.setData({ hideIfNoShare });
   const changeWA = (showWALine: boolean) => p.setData({ showWALine });
   const changeAC = (showACLine: boolean) => p.setData({ showACLine });
   return (
      <fieldset>
         <legend>Investments</legend>
         <Checkbox
             checked={p.hideIfNoShare ?? false}
             onChange={changeHide}
             text="Hide no longer traded stocks"
         />
         <Checkbox
             checked={p.showWALine ?? false}
             onChange={changeWA}
             text="Show Weighted Average lines in graphs"
         />
         <Checkbox
             checked={p.showACLine ?? false}
             onChange={changeAC}
             text="Show Average Cost lines in graphs"
         />
      </fieldset>
   );
}
export default Settings;
