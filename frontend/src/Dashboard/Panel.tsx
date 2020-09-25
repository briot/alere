import * as React from 'react';
import { Select } from 'Form';
import RoundButton from 'RoundButton';
import Dropdown from 'Form/Dropdown';
import { BaseProps } from 'Dashboard/Module';
import { getModule } from 'services/useDashboard';
import { HeaderProps } from 'Header';
import classes from 'services/classes';
import './Panel.css';

interface PanelProps {
   panel: BaseProps;
   setPanels: undefined | ((p: (old: BaseProps[]) => BaseProps[]) => void);
   index: number;
   excludeFields?: string[]; // Do not allow configuring those fields
}

const DashboardPanel: React.FC<PanelProps> = React.memo(p => {
   const [header, setHeader] = React.useState<HeaderProps>({});
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

   const c = classes(
      'panel',
      p.panel.type,
      `row${p.panel.rowspan}`,
      `col${p.panel.colspan}`,
   );

   return (
      <div className={c} >
         <div className="header">
            <h5>{header.title}</h5>
            <div className="group">
               {header.buttons}
               <Dropdown
                  button={(visible: boolean) =>
                     <RoundButton fa='fa-bars' size='tiny' selected={visible} />
                  }
                  menu={
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
                  }
               />
               {/*
                  <span className="fa fa-info-circle" />
                  <span className="fa fa-window-close" />
                */ }
            </div>
         </div>
         <div className="content">
            <m.Content
               {...p.panel as any}
               setHeader={setHeader}
               setData={localChange}
            />
         </div>
      </div>
   );
});

export default DashboardPanel;
