import * as React from 'react';
import usePrefs from '@/services/usePrefs';
import { Checkbox, Select } from '@/Form';
import Dialog from '@/Dialog';
import useAccounts, { CommodityId } from '@/services/useAccounts';

import './Settings.scss';

interface SettingsProps {
   onclose: () => void;
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
      <Dialog
         title='Settings'
         close_on_bg_click={false}
         onok={p.onclose}
         okText='Close'
      >
         <form>
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
         </form>
      </Dialog>
   );
}

export default Settings;
