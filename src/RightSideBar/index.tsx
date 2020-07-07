import React from 'react';
import Toolbar from 'ToolBar';
import AccountSummary from './AccountSummary';
import './RightSideBar.css';

interface RightSideBarProps {
}

const RightSideBar: React.FC<RightSideBarProps> = p => {
   return (
      <div id='rsidebar'>
         <Toolbar.Bar vertical={true}>
            <Toolbar.Group>
               <AccountSummary name="Socgen commun" amount={2300.12} />
               <AccountSummary name="Boursorama commun" amount={3300.12} />
               <AccountSummary name="Banque Postale" amount={-300.12} />
            </Toolbar.Group>
         </Toolbar.Bar>
      </div>
   );
}

export default RightSideBar;
