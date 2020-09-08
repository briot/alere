import * as React from 'react';
import { Select } from 'Form';
import RoundButton from 'RoundButton';
import { BaseProps } from 'Dashboard/Module';
import { getModule } from 'services/useDashboard';
import './Panel.css';

/**
 * Passed to any widget that can be displayed in a panel. The widget can call
 * setHeader to change either the page's header, or a panel's header,...
 */
export interface SetHeaderProps {
   setHeader?: (title: React.ReactNode|string|undefined) => void;
}

interface PanelProps {
   panel: BaseProps;
   setPanels: undefined | ((p: (old: BaseProps[]) => BaseProps[]) => void);
   index: number;
   excludeFields?: string[]; // Do not allow configuring those fields
}

const DashboardPanel: React.FC<PanelProps> = React.memo(p => {
   const [header, setHeader] = React.useState("");
   const [visible, setVisible] = React.useState(false);
   const { setPanels } = p;

   const m = getModule(p.panel.type);

   const showSettings = React.useCallback(
      () => setVisible(old => !old),
      []
   );

   const localChange = React.useCallback(
      (a: Partial<BaseProps>) =>
         setPanels?.(old => {
            const n = [...old];
            n[p.index] = {...n[p.index], ...a};
            return n;
         }),
      [setPanels, p.index]
   );
   const changeRows = React.useCallback(
      (rowspan: number) => localChange({rowspan}),
      [localChange]
   );
   const changeCols = React.useCallback(
      (colspan: number) => localChange({colspan}),
      [localChange]
   );

   const settings = React.useMemo(
      () => visible ? (
         <form>
            {
               m.Settings &&
               <m.Settings
                  {...p.panel }
                  setData={localChange}
                  excludeFields={p.excludeFields}
               />
            }
            <fieldset>
               <legend>Layout</legend>
               <Select
                  text="Rows"
                  value={p.panel.rowspan}
                  onChange={changeRows}
                  options={[
                     {text: "one row",    value: 1},
                     {text: "two rows",   value: 2},
                     {text: "three rows", value: 3},
                     {text: "four rows",  value: 4},
                  ]}
               />

               <Select
                  text="Columns"
                  value={p.panel.colspan}
                  onChange={changeCols}
                  options={[
                     {text: "one column",    value: 1},
                     {text: "two columns",   value: 2},
                     {text: "three columns", value: 3},
                     {text: "four columns",  value: 4},
                  ]}
               />
            </fieldset>
         </form>
      ) : null,
      [visible, p.panel, localChange, m, p.excludeFields,
       changeCols, changeRows]
   );

   return (
      <div className={`panel row${p.panel.rowspan} col${p.panel.colspan}`} >
         <div className="header">
            <h1>{header ?? ''}</h1>
            <div>
               <RoundButton
                  fa='fa-bars'
                  selected={visible}
                  size='tiny'
                  onClick={showSettings}
               />
               <div
                  className={`settings ${settings ? 'opened' : 'closed'}` }
               >
                  {settings}
               </div>
            </div>
            {/*
               <span className="fa fa-info-circle" />
               <span className="fa fa-window-close" />
             */ }
         </div>
         <div className="content">
            <m.Content {...p.panel as any} setHeader={setHeader} />
         </div>
      </div>
   );
});

export default DashboardPanel;
