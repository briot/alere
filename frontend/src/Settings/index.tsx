import * as React from 'react';
import usePrefs, { LedgerPrefs } from 'services/usePrefs';
import RoundButton from 'RoundButton';
import { Checkbox, Option, Select } from 'Form';
import { LedgerPrefsSettings } from 'Dashboard/LedgerPanel';
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
   const changeLedger = (ledgers: Partial<LedgerPrefs>) =>
      updatePrefs({ ledgers: {...prefs.ledgers, ...ledgers }});

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
                     >
                        <Option text="EUR" value="EUR" />
                        <Option text="USD" value="USD" />
                     </Select>

                  </fieldset>

                  <LedgerPrefsSettings
                     {...prefs.ledgers}
                     setData={changeLedger}
                  />
               </form>
            }
         </div>
      </>
   );
}

export default Settings;
