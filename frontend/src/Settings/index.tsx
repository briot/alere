import * as React from 'react';
import usePrefs from 'services/usePrefs';
import RoundButton from 'RoundButton';
import { Checkbox, Select } from 'Form';
import "./Settings.css";

interface SettingsProps {
}

const Settings: React.FC<SettingsProps> = p => {
   const [visible, setVisible] = React.useState(false);
   const { prefs, updatePrefs } = usePrefs();

   const toggleVisible = React.useCallback(
      () => setVisible(old => !old),
      []
   );

   const changeDark = (dark_mode: boolean) => updatePrefs({ dark_mode });
   const changeCurrency = (currencyId: string) => updatePrefs({ currencyId });

   return (
      <>
         <RoundButton
            fa='fa-gear'
            onClick={toggleVisible}
            selected={visible}
            size='small'
            title="Settings"
         />
         <div
            className={`settings ${visible ? 'opened' : 'closed'}`}
         >
            {
               visible &&
               <form>
                  <fieldset>
                     <legend>General</legend>

                     <Checkbox
                         checked={prefs.dark_mode}
                         onChange={changeDark}
                         text="Dark mode"
                     />

                     <Select
                         text="Display Currency"
                         onChange={changeCurrency}
                         value={prefs.currencyId}
                         options={[
                            {value: "EUR"},
                            {value: "USD"},
                         ]}
                     />

                  </fieldset>
               </form>
            }
         </div>
      </>
   );
}

export default Settings;
