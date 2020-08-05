import * as React from 'react';
import RoundButton from 'RoundButton';
import './LeftSideBar.css';

interface LeftSideBarProps {
}

const LeftSideBar: React.FC<LeftSideBarProps> = p => {
   return (
      <div id='lsidebar'>
         <RoundButton fa="fa-tachometer" text="Home" />
         <RoundButton fa="fa-book" text="Ledger" selected={true}/>
         <RoundButton fa="fa-balance-scale" text="Budget" />
         <RoundButton fa="fa-bank" text="Investments" />
         <RoundButton fa="fa-pie-chart" text="Reports" />
         <h3>Favorite reports</h3>
         <RoundButton fa="fa-line-chart" text="Custom 1" />
         <RoundButton fa="fa-line-chart" text="Custom 2" />
      </div>
   );
}

export default LeftSideBar;
