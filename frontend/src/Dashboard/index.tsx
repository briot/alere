import * as React from 'react';
import { BaseProps } from 'Dashboard/Module';
import DashboardPanel from 'Dashboard/Panel';
import { SetHeader } from 'Header';
import useDashboard from 'services/useDashboard';
import './Dashboard.css';

interface DashboardProps {
   name: string;     // dashboard name
   defaultPanels: BaseProps[],
   overrides?: Object;    //  Overrides settings for the panels
}
const Dashboard: React.FC<DashboardProps & SetHeader> = p => {
   const { setHeader } = p;
   const { panels, setPanels } = useDashboard(p.name, p.defaultPanels);

   React.useEffect(
      () => setHeader({title: p.name}),
      [setHeader, p.name]
   );

   return (
      <div className="dashboard main">
         {
            panels.map((p2, idx) =>
               <DashboardPanel
                  key={idx}
                  panel={{...p2, ...p.overrides}}
                  setPanels={setPanels}
                  excludeFields={Object.keys(p.overrides ?? {})}
                  index={idx} />
            )
         }
      </div>
   );
}
export default Dashboard;
