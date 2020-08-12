import * as React from 'react';
import usePrefs, { SplitMode, TransactionMode } from 'services/usePrefs';
import RoundButton from 'RoundButton';
import { Checkbox, Option, Select } from 'Form';
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

   const changeTrans = (trans_mode: string) =>
      updatePrefs({ ledgers: {...prefs.ledgers,
                              trans_mode: parseInt(trans_mode, 10)}});
   const changeSplit = (split_mode: string) =>
      updatePrefs({ ledgers: {...prefs.ledgers,
                              split_mode: parseInt(split_mode, 10)}});
   const changeBorders = (borders: boolean) =>
      updatePrefs({ledgers: {...prefs.ledgers, borders}});
   const changeDark = (dark_mode: boolean) => updatePrefs({ dark_mode });
   const changeExpand = (defaultExpand: boolean) =>
      updatePrefs({ ledgers: {...prefs.ledgers, defaultExpand}});
   const changeValueColumn = (valueColumn: boolean) =>
      updatePrefs({ledgers: {...prefs.ledgers, valueColumn}});
   const changeCurrency = (currencyId: string) =>
      updatePrefs({ currencyId });

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

                  <fieldset>
                     <legend>Ledgers</legend>

                     { /*
                     <div className="option">
                        <label htmlFor="ledgermode">Show details</label>
                        <select
                            disabled={true}
                            id="ledgermode"
                        >
                            <option>Collapse splits</option>
                            <option>Expand current split</option>
                            <option>Expand all splits</option>
                        </select>
                     </div>
                     */ }

                     <Checkbox
                         checked={prefs.ledgers.borders}
                         onChange={changeBorders}
                         text="Show borders"
                     />
                     <Checkbox
                         checked={prefs.ledgers.valueColumn}
                         onChange={changeValueColumn}
                         text="Deposit and paiements in same column"
                     />
                     <Checkbox
                         checked={prefs.ledgers.defaultExpand}
                         onChange={changeExpand}
                         text="Expand rows by default"
                     />

                     <Select
                         text="Memos"
                         onChange={changeTrans}
                         value={prefs.ledgers.trans_mode}
                     >
                         <Option
                             text="Hide memos"
                             value={TransactionMode.ONE_LINE}
                         />
                         <Option
                             text="Show memos if not empty"
                             value={TransactionMode.AUTO}
                         />
                         <Option
                             text="Show memos always"
                             value={TransactionMode.TWO_LINES}
                         />
                     </Select>

                     <Select
                         text="Splits"
                         onChange={changeSplit}
                         value={prefs.ledgers.split_mode}
                     >
                         <Option
                             text="Never show splits"
                             value={SplitMode.HIDE}
                         />
                         <Option
                             text="Show summary"
                             value={SplitMode.SUMMARY}
                         />
                         <Option
                             text="Show if more than two accounts"
                             value={SplitMode.COLLAPSED}
                         />
                         <Option
                             text="Multiple rows, no duplicate"
                             value={SplitMode.OTHERS}
                         />
                         <Option
                             text="Multiple rows"
                             value={SplitMode.MULTILINE}
                         />
                     </Select>

                     <Select
                         text="Editing"
                         disabled={true}
                         value="inline"
                     >
                         <option>Inline</option>
                         <option>Separate window</option>
                     </Select>
                  </fieldset>
               </form>
            }
         </div>
      </>
   );
}

export default Settings;
