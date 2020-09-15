import React from 'react';
import './Header.css';


interface HeaderProps {
   title: React.ReactNode|string|undefined;
}

const Header: React.FC<HeaderProps> = p => {
   return (
      <div id='header'>
         <div className='title'>
             {p.title || ''}
         </div>
      </div>
   );
}
export default Header
