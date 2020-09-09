import * as React from 'react';
import usePrefs from 'services/usePrefs';
import RoundButton from 'RoundButton';
import Dropdown from '../Form/Dropdown';
import { Checkbox, Select } from 'Form';

interface SettingsProps {
}

const Settings: React.FC<SettingsProps> = p => {
   const { prefs, updatePrefs } = usePrefs();
   const changeDark = (dark_mode: boolean) => updatePrefs({ dark_mode });
   const changeCurrency = (currencyId: string) => updatePrefs({ currencyId });

   return (
      <Dropdown
         className="settings"
         button={
            <RoundButton
               fa='fa-gear'
               size='small'
               title="Settings"
            />
         }
         menu={() => (
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
         )}
     />
   );
}

export default Settings;
