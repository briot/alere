import React from 'react';
import Settings from '@/Settings';
import OnlineUpdate from '@/Header/OnlineUpdate';
import Tooltip from '@/Tooltip';
import './Header.scss';

export interface HeaderProps {
   name?: string|React.ReactNode;
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
   return (
      <div id='header'>
         <Tooltip tooltip={p.tooltip}>
            <div className='title'>
                {p.name ?? ''}
            </div>
         </Tooltip>

         <div className='group'>
            {p.buttons}
            <OnlineUpdate />
            <Settings />
         </div>

      </div>
   );
}
export default Header
