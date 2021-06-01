import React from 'react';
import { DateRange, rangeDisplay } from '@/Dates';
import Tooltip from '@/Tooltip';
import './Header.scss';

export interface HeaderProps {
   name?: string;
   node?: React.ReactNode;
   range?: DateRange;  // timestamp used to compute values
   tooltip?: string;
   buttons?: React.ReactNode|React.ReactNode[];
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
   return (
      <div className='header'>
         <Tooltip tooltip={ p.tooltip ?? r?.as_dates }>
            <h5>
                {p.node}
                {p.name}
                {
                   r?.text
                   ? <span> &mdash; {r.text}</span>
                   : ''
                }
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
