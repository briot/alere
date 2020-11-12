import * as React from 'react';
import usePrefs from 'services/usePrefs';
import RoundButton from 'RoundButton';
import Dropdown from '../Form/Dropdown';
import { Checkbox, Select } from 'Form';
import useAccounts, { CommodityId } from 'services/useAccounts';

interface SettingsProps {
}

const Settings: React.FC<SettingsProps> = p => {
   const { accounts } = useAccounts();
   const { prefs, updatePrefs } = usePrefs();
   const changeDark = (dark_mode: boolean) => updatePrefs({ dark_mode });
   const changeCurrency =
      (currencyId: CommodityId) => updatePrefs({ currencyId });

   return (
      <Dropdown
         animate={true}
         className="settings"
         button={(visible: boolean) =>
            <RoundButton
               fa='fa-gear'
               selected={visible}
               size='small'
               title="Global Settings"
            />
         }
         menu={
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
                      options={
                         Object.values(accounts.allCommodities)
                            .filter(c => c.is_currency)
                            .map(c => ({value: c.id, text: c.name}))
                      }
                  />

               </fieldset>
            </form>
         }
     />
   );
}

export default Settings;
