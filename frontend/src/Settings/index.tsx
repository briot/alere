import * as React from 'react';
import usePrefs from '@/services/usePrefs';
import RoundButton from '@/RoundButton';
import Dropdown from '@/Form/Dropdown';
import { Checkbox, Select } from '@/Form';
import useAccounts, { CommodityId } from '@/services/useAccounts';

interface SettingsProps {
}

const Settings: React.FC<SettingsProps> = p => {
   const { accounts } = useAccounts();
   const { prefs, updatePrefs } = usePrefs();
   const changeDark = (dark_mode: boolean) => updatePrefs({ dark_mode });
   const changeCurrency =
      (currencyId: CommodityId) => updatePrefs({ currencyId });
   const changeNeumorph =
      (neumorph_mode: boolean) => updatePrefs({ neumorph_mode });
   const changeTL = (text_on_left: boolean) => updatePrefs({ text_on_left });

   return (
      <Dropdown
         animate={true}
         className="settings"
         button={(visible: boolean) =>
            <RoundButton
               fa='fa-gear'
               selected={visible}
               size='small'
               tooltip="Global Settings"
            />
         }
         menu={
            <form>
               <fieldset>
                  <legend>General</legend>

                  <Checkbox
                      value={prefs.dark_mode}
                      onChange={changeDark}
                      text="Dark mode"
                  />
                  <Checkbox
                      value={prefs.neumorph_mode}
                      onChange={changeNeumorph}
                      text="Neumorphism mode"
                  />
                  <Checkbox
                      value={prefs.text_on_left}
                      onChange={changeTL}
                      text="Show text on left side"
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
