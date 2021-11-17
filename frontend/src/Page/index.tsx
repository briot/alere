/**
 * A button that displays a page, showing a number of hard-coded panels
 */
import * as React from 'react';
import { useHistory, Redirect } from 'react-router-dom';
import { SetHeader } from '@/Header';
import { DashboardFromPanels } from '@/Dashboard';
import { PanelBaseProps } from '@/Dashboard/Panel';
import RoundButton from '@/RoundButton';
import { usePages } from '@/services/usePages';
import './Page.scss';

interface PageButtonProps {
   name: string;
   panel: PanelBaseProps;
}

export const PageButton: React.FC<PageButtonProps> = p => {
   const { addPage } = usePages();
   const history = useHistory();
   const showPage = React.useCallback(
      () =>
         addPage(p.name, [{...p.panel, rowspan: 1, colspan: 4}], true /* tmp */)
         .then(url => history.push(url)),
      [p.name, p.panel, addPage, history]
   );
   return (
      <RoundButton
         fa="fa-expand"
         tooltip="Expand full screen"
         size="tiny"
         onClick={showPage}
      />
   );
}


interface PageProps {
   name: string;
}
export const Page: React.FC<PageProps & SetHeader> = React.memo(p => {
   const { setHeader } = p;
   const { pages, getPanels, deletePage, updatePage } = usePages();
   const page = pages[p.name];
   const { headerNode } = page;
   const centralPanels = getPanels(p.name, "central");
   const rightPanels = getPanels(p.name, "right");

   const updateRight = React.useCallback(
      (func: ((prev: PanelBaseProps[]) => PanelBaseProps[])) =>
         updatePage(p.name, func(rightPanels), "right"),
      [updatePage, p.name, rightPanels]
   );
   const updateCentral = React.useCallback(
      (func: ((prev: PanelBaseProps[]) => PanelBaseProps[])) =>
         updatePage(p.name, func(centralPanels), "central"),
      [updatePage, p.name, centralPanels]
   );

   // Delete temporary pages when we move away from them
   React.useEffect(
      () => () => {
         if (page?.tmp) {
            deletePage(p.name);
         }
      },
      [page?.tmp, p.name, deletePage]
   );

   React.useEffect(
      () => setHeader(headerNode
         ? {node: headerNode()}
         : {name: p.name}),
      [setHeader, p.name, headerNode]
   );

   if (!page) {
      return <Redirect to="/" />;
   }
   return (
      <>
          <DashboardFromPanels
             className="main"
             panels={getPanels(p.name, 'central')}
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
