import * as React from 'react';
import { PanelBaseProps } from '@/Dashboard/Panel';
import PANELS from '@/Dashboard/Register';
import classes from '@/services/classes';
import './Dashboard.scss';

interface PanelWrapperProps {
   panel: PanelBaseProps;
   index: number;

   setPanels: (value: (prevState: PanelBaseProps[]) => PanelBaseProps[]) => void;
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

   // 'M' must start with an upper-case (for typescript), this is a component
   const M = PANELS[p.panel.type];
   if (!M) {
      window.console.warn('No registered panel', p.panel.type, PANELS);
      return null;
   }

   return (
      <M
         props={p.panel}
         save={localChange}
      />
   );
}

interface DashboardFromPanelsProps {
   panels: PanelBaseProps[];
   setPanels: (value: (prevState: PanelBaseProps[]) => PanelBaseProps[]) => void;
   className?: string;
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
                  panel={{...p2, allowMaximize: p.panels.length > 1}}
                  setPanels={p.setPanels}
                  index={idx}
               />
            )
         }
      </div>
   );
}
