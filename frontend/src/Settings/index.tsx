import * as React from 'react';
import Toolbar from 'ToolBar';
import usePrefs, { SplitMode, TransactionMode } from 'services/usePrefs';
import "./Settings.css";

interface CheckboxProps {
   checked: boolean;
   disabled?: boolean;
   onChange?: (checked: boolean) => void;
   text?: string;
}
const Checkbox: React.FC<CheckboxProps> = p => {
   const changed = (event: React.ChangeEvent<HTMLInputElement>) =>
      p.onChange?.(event.target.checked);

   return (
      <div className={`button option ${p.disabled ? 'disabled' : ''}`}>
         <label>
            <input
               checked={p.checked}
               disabled={p.disabled}
               onChange={changed}
               type="checkbox"
            />
            {p.text}
         </label>
      </div>
   );
}


interface OptionProps {
   text?: string;
   value?: string|number;
}

const Option: React.FC<OptionProps> = p => {
   return (
      <option value={p.value}>{p.text}</option>
   );
}

interface SettingsProps {
}

const Settings: React.FC<SettingsProps> = p => {
   const [visible, setVisible] = React.useState(false);
   const { prefs, updatePrefs } = usePrefs();

   const toggleVisible = React.useCallback(
      () => setVisible(old => !old),
      []
   );

   const changeTrans = (event: React.ChangeEvent<HTMLSelectElement>) =>
      updatePrefs({
         ledgers: {...prefs.ledgers,
                   trans_mode: parseInt(event.target.value, 10)},
      });

   const changeSplit = (event: React.ChangeEvent<HTMLSelectElement>) =>
      updatePrefs({
         ledgers: {...prefs.ledgers,
                   split_mode: parseInt(event.target.value, 10)},
      });

   const changeBorders = (checked: boolean) =>
      updatePrefs({
         ledgers: {...prefs.ledgers,
                   borders: checked},
      });

   const changeExpand = (checked: boolean) =>
      updatePrefs({
         ledgers: {...prefs.ledgers,
                   defaultExpand: checked},
      });

   return (
      <>
         <Toolbar.Button
            icon="fa-gear"
            onClick={toggleVisible}
            title="Settings"
         />
         <div className={`settings ${visible ? 'opened' : 'closed'}`} >
            {
               visible &&
               <form>
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
                         text="Deposit and paiements in same column"
                         checked={false}
                         disabled={true}
                     />
                     <Checkbox
                         checked={prefs.ledgers.defaultExpand}
                         onChange={changeExpand}
                         text="Expand rows by default"
                     />

                     <div className="option">
                        <label htmlFor="transmode">Memos</label>
                        <select
                           id="transmode"
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
                        </select>
                     </div>

                     <div className="option">
                        <label htmlFor="splitmode">Splits</label>
                        <select
                            id="splitmode"
                            onChange={changeSplit}
                            value={prefs.ledgers.split_mode}
                        >
                            <Option
                                text="Never show splits"
                                value={SplitMode.HIDE}
                            />
                            <Option
                                text="Show splits if more than two"
                                value={SplitMode.COLLAPSED}
                            />
                            <Option
                                text="Show multiple rows"
                                value={SplitMode.MULTILINE}
                            />
                            <Option
                                text="Show summary"
                                value={SplitMode.SUMMARY}
                            />
                        </select>
                     </div>

                     <div className="option">
                        <label htmlFor="editing">Editing</label>
                        <select
                            disabled={true}
                            id="editing"
                        >
                            <option>Inline</option>
                            <option>Separate window</option>
                        </select>
                     </div>
                  </fieldset>
               </form>
            }
         </div>
      </>
   );
}

export default Settings;
