import * as React from 'react';
import Panel from 'Panel';
import { BaseProps, BasePropEditor } from 'Dashboard/Module';
import { getModule } from 'services/useDashboard';

interface PanelProps {
   panels: BaseProps[];
   setPanels: undefined | ((p: (old: BaseProps[]) => BaseProps[]) => void);
   index: number;
}

const DashboardPanel: React.FC<PanelProps> = React.memo(p => {
   const [header, setHeader] = React.useState("");
   const { setPanels } = p;
   const p2 = p.panels[p.index];
   const m = getModule(p2.type);

   const localChange = React.useCallback(
      (a: Partial<BaseProps>) =>
         setPanels?.(old => {
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
                  {...p2 }
                  setData={localChange}
               />
            }
            <BasePropEditor {...p2} setData={localChange} />
         </form>
      ),
      [p2, localChange, m]
   );

   return (
      <Panel
         rows={p2.rowspan}
         cols={p2.colspan}
         header={header}
         settings={setPanels ? settings : undefined}
      >
         <m.Content {...p2 as any} setHeader={setHeader} />
      </Panel>
   );
});

export default DashboardPanel;
