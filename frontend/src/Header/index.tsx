import React from 'react';
import { DateRange, rangeDisplay } from '@/Dates';
import { useHistory } from 'react-router-dom';
import { usePages } from '@/services/usePages';
import { PanelBaseProps } from '@/Dashboard/Props';
import Tooltip from '@/Tooltip';
import './Header.scss';

export interface HeaderProps {
   children?: React.ReactNode;
   name?: string;
   node?: React.ReactNode;
   range?: DateRange;  // timestamp used to compute values
   tooltip?: string;
   buttons?: React.ReactNode|React.ReactNode[];

   panel?: PanelBaseProps;
   //  If specified, clicking on the header name will maximize the
   //  corresponding panel in a new page.
}

/**
 * Passed to any widget that can be displayed in a panel. The widget can call
 * setHeader to change either the page's header, or a panel's header,...
 */
export interface SetHeader {
   setHeader: React.Dispatch<React.SetStateAction<HeaderProps>>;
}

const Header: React.FC<HeaderProps> = p => {
   const r = p.range ? rangeDisplay(p.range) : undefined;

   const { addPage } = usePages();
   const history = useHistory();
   const maximize = React.useCallback(
      () => {
         if (p.panel) {
            addPage(
               p.name ?? '',
               `/userPage/${p.name ?? ''}` /* url */,
               [{...p.panel, rowspan: 1, colspan: 4}],
               true /* tmp */)
            .then(url => history.push(url));
         }
      },
      [p.name, p.panel, addPage, history]
   );

   const canMaximize = p.panel !== undefined;
   // ??? and not already single panel in page

   return (
      <div className='header'>
         <Tooltip tooltip={ p.tooltip ?? r?.as_dates }>
            <h5>
                {p.node}
                <span
                   onClick={maximize}
                   className={canMaximize ? 'canMaximize' : undefined}
                >
                   {p.name}
                   {
                      r?.text
                      ? <span> &mdash; {r.text}</span>
                      : ''
                   }
                </span>
            </h5>
         </Tooltip>

         <div className='group'>
            {p.buttons}
            {p.children}
         </div>

      </div>
   );
}
export default Header
