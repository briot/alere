import * as React from 'react';
import Panel from 'Panel';
import { BaseProps, BasePropEditor } from 'Dashboard/Module';
import { getModule } from 'services/useDashboard';

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

   const settings = React.useCallback(
      () => (
         <form>
            {
               m.Settings &&
               <m.Settings
                  {...p.panel }
                  setData={localChange}
                  excludeFields={p.excludeFields}
               />
            }
            <BasePropEditor {...p.panel} setData={localChange} />
         </form>
      ),
      [p.panel, localChange, m, p.excludeFields]
   );

   return (
      <Panel
         rows={p.panel.rowspan}
         cols={p.panel.colspan}
         header={header}
         settings={setPanels ? settings : undefined}
      >
         <m.Content {...p.panel as any} setHeader={setHeader} />
      </Panel>
   );
});

export default DashboardPanel;
