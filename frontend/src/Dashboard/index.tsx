import * as React from 'react';
import { BaseProps, BasePropEditor, DashboardModule } from 'Dashboard/Panels';
import Panel, { SetHeaderProps } from 'Panel';
import useDashboard, { DASHBOARD_MODULES } from 'services/useDashboard';
import './Dashboard.css';

const NotAvailableModule: DashboardModule<BaseProps> = {
   Content: (p: BaseProps & SetHeaderProps) => {
      const { setHeader } = p;
      React.useEffect(
         () => setHeader?.(p.type),
         [setHeader, p.type]
      );
      return <span>Not available</span>
   }
};

interface PanelProps {
   panels: BaseProps[];
   setPanels: (p: (old: BaseProps[]) => BaseProps[]) => void;
   index: number;
}

const DashboardPanel: React.FC<PanelProps> = React.memo(p => {
   const [header, setHeader] = React.useState("");
   const { setPanels } = p;
   const p2 = p.panels[p.index];
   const m = DASHBOARD_MODULES[p2.type] || NotAvailableModule;

   const localChange = React.useCallback(
      (a: Partial<BaseProps>) =>
         setPanels(old => {
            const n = [...old];
            n[p.index] = {...n[p.index], ...a};
            return n;
         }),
      [setPanels, p.index]
   );

   const settings = React.useCallback(
      () => (
         <form>
            {
               m.Settings &&
               <m.Settings
                  data={p2 as any}
                  setData={localChange}
               />
            }
            <BasePropEditor data={p2} setData={localChange} />
         </form>
      ),
      [p2, localChange, m]
   );

   return (
      <Panel
         rows={p2.rowspan}
         cols={p2.colspan}
         header={header}
         settings={settings}
      >
         <m.Content {...p2 as any} setHeader={setHeader} />
      </Panel>
   );
});


const Dashboard: React.FC<SetHeaderProps> = p => {
   const { panels, setPanels } = useDashboard('main');
   const { setHeader } = p;

   React.useEffect(
      () => setHeader?.('Overview'),
      [setHeader]
   );

   return (
      <div className="dashboard">
         {
            panels.map((p2, idx) =>
               <DashboardPanel
                  key={idx}
                  panels={panels}
                  setPanels={setPanels}
                  index={idx} />
            )
         }
      </div>
   );
}

export default Dashboard;
