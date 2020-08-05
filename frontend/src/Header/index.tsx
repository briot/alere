import React from 'react';
import './Header.css';
import RoundButton from 'RoundButton';
import Settings from 'Settings';


interface HeaderProps {
   title: string;
}

const Header: React.FC<HeaderProps> = p => {
   return (
      <div id='header'>
         <div className='title'>
             {p.title}
         </div>
         <div className='group'>
            <RoundButton fa='fa-refresh' title='sync' />
            <Settings />
         </div>
      </div>
   );
}
export default Header
