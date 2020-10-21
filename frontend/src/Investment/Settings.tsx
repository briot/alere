import * as React from 'react';
import { InvestmentsPanelProps } from 'Investment/Panel';
import { Checkbox } from 'Form';
import { PanelProps } from 'Dashboard/Panel';

const Settings: React.FC<PanelProps<InvestmentsPanelProps>> = p => {
   const changeHide = (hideIfNoShare: boolean) => p.save({ hideIfNoShare });
   const changeWA = (showWALine: boolean) => p.save({ showWALine });
   const changeAC = (showACLine: boolean) => p.save({ showACLine });
   return (
      <fieldset>
         <legend>Investments</legend>
         <Checkbox
             checked={p.props.hideIfNoShare ?? false}
             onChange={changeHide}
             text="Hide no longer traded stocks"
         />
         <Checkbox
             checked={p.props.showWALine ?? false}
             onChange={changeWA}
             text="Show Weighted Average lines in graphs"
         />
         <Checkbox
             checked={p.props.showACLine ?? false}
             onChange={changeAC}
             text="Show Average Cost lines in graphs"
         />
      </fieldset>
   );
}
export default Settings;
