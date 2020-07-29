import React from 'react';
import './Header.css';
import Toolbar from 'ToolBar';


interface HeaderProps {
   title: string;
}

const Header: React.FC<HeaderProps> = p => {
   return (
      <div id='header'>
         <Toolbar.Bar vertical={false} background={true}>
            <Toolbar.Button grows={true} label={p.title} />
            <Toolbar.Group>
               <Toolbar.Button title="Sync" icon="fa-refresh" />
               <Toolbar.Button title="Settings" icon="fa-gear" />
            </Toolbar.Group>
         </Toolbar.Bar>
      </div>
   );
}
export default Header