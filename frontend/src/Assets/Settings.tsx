import * as React from 'react';
import { AssetsPanelProps } from '@/Assets/Panel';
import { PanelProps } from '@/Dashboard/Panel';
import { Checkbox } from '@/Form';

const Settings: React.FC<PanelProps<AssetsPanelProps>> = p => {
   const changeRound = (roundValues: boolean) => p.save({ roundValues });
   return (
      <fieldset>
         <legend>Assets</legend>
         <Checkbox
            checked={p.props.roundValues}
            onChange={changeRound}
            text="Round values"
         />
      </fieldset>
   );
}
export default Settings;
