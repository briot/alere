import React from 'react';
import Toolbar from 'ToolBar';
import './LeftSideBar.css';

interface LeftSideBarProps {
}

const LeftSideBar: React.FC<LeftSideBarProps> = p => {
   return (
      <div id='lsidebar'>
         <Toolbar.Bar vertical={true} background={true}>
            <Toolbar.Group>
               <Toolbar.Button
                  label="Home"
                  icon="fa-tachometer"
                  title="Dashboard"
               />
               <Toolbar.Button
                  label="Ledger"
                  icon="fa-book"
                  title="Accounts and Ledgets"
               />
               <Toolbar.Button
                  label="Budget"
                  icon="fa-balance-scale"
               />
               <Toolbar.Button
                  label="Invest"
                  icon="fa-bank"
                  title="Investments"
               />
               <Toolbar.Button
                  label="Reports"
                  icon="fa-pie-chart"
               />
            </Toolbar.Group>
            <Toolbar.Group>
               <Toolbar.Button
                  label="Custom 1"
                  icon="fa-line-chart"
               />
               <Toolbar.Button
                  label="Custom 2"
                  icon="fa-line-chart"
               />
           </Toolbar.Group>
         </Toolbar.Bar>
      </div>
   );
}

export default LeftSideBar;
