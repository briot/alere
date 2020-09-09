import * as React from 'react';
import { Select } from 'Form';
import RoundButton from 'RoundButton';
import Dropdown from 'Form/Dropdown';
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
   const { setPanels } = p;

   const m = getModule(p.panel.type);

   const localChange = React.useCallback(
      (a: Partial<BaseProps>) =>
         setPanels?.(old => {
            const n = [...old];
            n[p.index] = {...n[p.index], ...a};
            return n;
         }),
      [setPanels, p.index]
   );
   const changeRows = (rowspan: number) => localChange({rowspan});
   const changeCols = (colspan: number) => localChange({colspan});

   return (
      <div className={`panel row${p.panel.rowspan} col${p.panel.colspan}`} >
         <div className="header">
            <h1>{header ?? ''}</h1>
            <Dropdown
               button={
                  <RoundButton fa='fa-bars' size='tiny' />
               }
               menu={() => (
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
               )}
            />
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
