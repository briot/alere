/**
 * A button that displays a page, showing a number of hard-coded panels
 */
import * as React from 'react';
import { useHistory, Redirect } from 'react-router-dom';
import { HeaderProps, SetHeader } from '@/Header';
import Dashboard from '@/Dashboard';
import { PanelBaseProps } from '@/Dashboard/Panel';
import RoundButton from '@/RoundButton';
import { usePages } from '@/services/usePages';
import './RightSideBar.scss';

const doNothing = () => {};

interface PageButtonProps {
   name: HeaderProps;
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
         showText={false}
         size="tiny"
         onClick={showPage}
      />
   );
}


interface PageProps {
   name: string;
}
export const Page: React.FC<PageProps & SetHeader> = React.memo(p => {
   const { pages, getPanels, deletePage, updatePage } = usePages();
   const page = pages[p.name];
   const initialPanels = getPanels(p.name, 'central');
   const rightPanels = getPanels(p.name, 'right');
   const [ panels, setPanels ] = React.useState(initialPanels);

   // Save to local storage
   React.useEffect(
      () => updatePage(p.name, panels),
      [p.name, panels, updatePage]
   );

   React.useEffect(
      () => () => {
         if (page?.tmp) {
            deletePage(p.name);
         }
      },
      [page?.tmp, p.name, deletePage]
   );

   if (!page) {
      return <Redirect to="/" />;
   }

   return (
      <>
          <Dashboard
             name={p.name}
             className="main"
             panels={panels}
             savePanels={setPanels}
             setHeader={p.setHeader}
          />
          <div id='rsidebar'>
             <Dashboard
                 name="rightside"
                 panels={rightPanels}
                 savePanels={setPanels}
                 setHeader={doNothing}
             />
          </div>
      </>
   );
});
