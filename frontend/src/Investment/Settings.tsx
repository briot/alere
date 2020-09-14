import * as React from 'react';
import { InvestmentsPanelProps } from 'Investment/Panel';
import { Checkbox } from 'Form';
import { SettingsProps } from 'Dashboard/Module';

const Settings: React.FC<
   InvestmentsPanelProps & SettingsProps<InvestmentsPanelProps>
> = p => {
   const changeBorders = (borders: boolean) => p.setData({ borders });
   const changeHide = (hideIfNoShare: boolean) => p.setData({ hideIfNoShare });
   return (
      <fieldset>
         <legend>Investments</legend>
         <Checkbox
             checked={p.borders ?? false}
             onChange={changeBorders}
             text="Show borders"
         />
         <Checkbox
             checked={p.hideIfNoShare ?? false}
             onChange={changeHide}
             text="Hide no longer traded stocks"
         />
      </fieldset>
   );
}
export default Settings;
