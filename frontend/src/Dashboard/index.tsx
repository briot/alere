import * as React from 'react';
import { BaseProps } from 'Dashboard/Module';
import DashboardPanel, { SetHeaderProps } from 'Dashboard/Panel';
import useDashboard from 'services/useDashboard';
import './Dashboard.css';

export interface DashboardProps {
   panels: BaseProps[];
   setPanels?: (p: (old: BaseProps[])=>BaseProps[]) => void;
   defaults?: Object;    //  Overrides settings for the panels
}
export const Dashboard: React.FC<DashboardProps> = p => {
   return (
      <div className="dashboard">
         {
            p.panels.map((p2, idx) =>
               <DashboardPanel
                  key={idx}
                  panel={{...p2, ...p.defaults}}
                  setPanels={p.setPanels}
                  excludeFields={Object.keys(p.defaults ?? {})}
                  index={idx} />
            )
         }
      </div>
   );
}

export interface DashboardFromNameProps extends SetHeaderProps {
   name: string;     // dashboard name
   defaultPanels: BaseProps[],
}
const DashboardFromName: React.FC<DashboardFromNameProps> = p => {
   const { setHeader } = p;
   const { panels, setPanels } = useDashboard(p.name, p.defaultPanels);

   React.useEffect(
      () => setHeader?.(p.name),
      [setHeader, p.name]
   );

   return (
      <Dashboard
         panels={panels}
         setPanels={setPanels}
      />
   );
}
export default DashboardFromName;
