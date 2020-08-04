import React from 'react';
import './Header.css';
import Toolbar from 'ToolBar';
import Settings from 'Settings';


interface HeaderProps {
   title: string;
}

const Header: React.FC<HeaderProps> = p => {
   return (
      <div id='header'>
         <Toolbar.Bar background={true}>
            <Toolbar.Button grows={true} label={p.title} />
            <Toolbar.Group>
               <Toolbar.Button title="Sync" icon="fa-refresh" />
               <Settings />
            </Toolbar.Group>
         </Toolbar.Bar>
      </div>
   );
}
export default Header
