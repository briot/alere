import * as React from 'react';
import { PanelBaseProps, PANELS } from 'Dashboard/Panel';
import { SetHeader } from 'Header';
import useSettings from 'services/useSettings';
import classes from 'services/classes';
import './Dashboard.css';


interface PanelWrapperProps {
   panel: PanelBaseProps;
   index: number;
   excludeFields: string[]; // Do not allow configuring those fields

   setPanels: React.Dispatch<React.SetStateAction<PanelBaseProps[]>>;
   // settings are disabled when this is null, since there would be no way to
   // save the changes.
}
const PanelWrapper: React.FC<PanelWrapperProps> = p => {
   const { setPanels } = p;

   /**
    * Let panels change a subset of their properties, and impact those changes
    * on the whole list of panels
    */
   const localChange = React.useCallback(
      (a: Partial<PanelBaseProps>) =>
         setPanels(old => {
            const n = [...old];
            n[p.index] = {...n[p.index], ...a};
            return n;
         }),
      [setPanels, p.index]
   );

   // must start with an upper-case (for typescript), this is a component
   const M = PANELS[p.panel.type];
   if (!M) {
      return null;
   }

   return (
      <M
         props={p.panel}
         save={localChange}
         excludeFields={p.excludeFields}
      />
   );
}

interface DashboardFromPanelsProps {
   panels: PanelBaseProps[];
   setPanels: React.Dispatch<React.SetStateAction<PanelBaseProps[]>>;
   className?: string;
   overrides?: Object;    //  Overrides settings for the panels
}
export const DashboardFromPanels: React.FC<DashboardFromPanelsProps> = p => {
   const c = classes(
      'dashboard',
      p.className,
   );
   return (
      <div className={c}>
         {
            p.panels.map((p2, idx) =>
               <PanelWrapper
                  key={idx}
                  panel={{...p2, ...p.overrides}}
                  setPanels={p.setPanels}
                  excludeFields={Object.keys(p.overrides ?? {})}
                  index={idx}
               />
            )
         }
      </div>
   );
}



interface DashboardProps {
   name: string;     // dashboard name
   defaultPanels: PanelBaseProps[],
   overrides?: Object;    //  Overrides settings for the panels
}
const Dashboard: React.FC<DashboardProps & SetHeader> = p => {
   const { setHeader } = p;
   const { val, setVal } =
      useSettings<PanelBaseProps[]>(`dash-${p.name}`, p.defaultPanels);

   React.useEffect(
      () => setHeader({title: p.name}),
      [setHeader, p.name]
   );

   return (
      <div className="dashboard main">
         {
            val.map((p2, idx) =>
               <PanelWrapper
                  key={idx}
                  panel={{...p2, ...p.overrides}}
                  setPanels={setVal}
                  excludeFields={Object.keys(p.overrides ?? {})}
                  index={idx}
               />
            )
         }
      </div>
   );
}
export default Dashboard;
