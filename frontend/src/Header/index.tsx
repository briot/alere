import React from 'react';
import Settings from 'Settings';
import './Header.css';

export interface HeaderProps {
   name?: string|React.ReactNode;
   title?: string;  // tooltip
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
   return (
      <div id='header'>
         <div className='title' title={p.title}>
             {p.name ?? ''}
         </div>

         <div className='group'>
            {p.buttons}
            <Settings />
         </div>

      </div>
   );
}
export default Header
