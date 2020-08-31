import * as React from 'react';
import { SetHeaderProps } from 'Panel';
import { BaseProps } from 'Dashboard/Module';
import DashboardPanel from 'Dashboard/Panel';
import useDashboard from 'services/useDashboard';
import './Dashboard.css';

export interface DashboardProps extends SetHeaderProps {
   panels: BaseProps[];
   setPanels?: (p: (old: BaseProps[])=>BaseProps[]) => void;
   header: string;
}
export const Dashboard: React.FC<DashboardProps> = p => {
   const { setHeader } = p;

   React.useEffect(
      () => setHeader?.(p.header),
      [setHeader, p.header]
   );

   return (
      <div className="dashboard">
         {
            p.panels.map((p2, idx) =>
               <DashboardPanel
                  key={idx}
                  panels={p.panels}
                  setPanels={p.setPanels}
                  index={idx} />
            )
         }
      </div>
   );
}

export interface DashboardFromNameProps extends SetHeaderProps {
   name: string;     // dashboard name
}
const DashboardFromName: React.FC<DashboardFromNameProps> = p => {
   const { panels, setPanels } = useDashboard(p.name);
   return <Dashboard
      panels={panels}
      setPanels={setPanels}
      header={p.name}
      setHeader={p.setHeader}
   />;
}
export default DashboardFromName;
