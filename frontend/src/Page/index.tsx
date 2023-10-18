/**
 * A button that displays a page, showing a number of hard-coded panels
 */
import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardFromPanels } from '@/Dashboard';
import { PanelBaseProps } from '@/Dashboard/Panel';
import { usePages } from '@/services/usePages';
import './Page.scss';

interface PageProps {
   url: string;
}
export const Page: React.FC<PageProps> = React.memo(p => {
   const { getPage, getPanels, deletePage, updatePage } = usePages();
   const page = getPage(p.url);
   const centralPanels = getPanels(page, "central");
   const rightPanels = React.useMemo(
      () => getPanels(page, "right").map(p => ({...p, allowCollapse: true})),
      [getPanels, page]
   );

   const updateRight = React.useCallback(
      (func: ((prev: PanelBaseProps[]) => PanelBaseProps[])) =>
         updatePage(page, func(rightPanels), "right"),
      [updatePage, page, rightPanels]
   );
   const updateCentral = React.useCallback(
      (func: ((prev: PanelBaseProps[]) => PanelBaseProps[])) =>
         updatePage(page, func(centralPanels), "central"),
      [updatePage, page, centralPanels]
   );

   // Delete temporary pages when we move away from them
   React.useEffect(
      () => () => {
         if (page?.tmp) {
            deletePage(page);
         }
      },
      [page?.tmp, page, deletePage]
   );

   if (!page) {
      return <Navigate to="/" replace={true} />;
   }
   return (
      <>
          <DashboardFromPanels
             className="main"
             panels={centralPanels}
             setPanels={updateCentral}
          />
          <DashboardFromPanels
              className="rsidebar"
              panels={rightPanels}
              setPanels={updateRight}
          />
      </>
   );
});
