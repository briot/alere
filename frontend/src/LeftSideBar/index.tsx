import React from 'react';
import './LeftSideBar.css';

interface RoundButtonProps {
   icon: string;
   text: string;
   selected?: boolean;
}

const RoundButton: React.FC<RoundButtonProps> = p => {
   return (
      <a href='#a' className={`roundButton ${p.selected ? 'selected' : ''}`} >
         <span className={`fa ${p.icon}`} />
         <span>{p.text}</span>
      </a>
   );
}

interface LeftSideBarProps {
}

const LeftSideBar: React.FC<LeftSideBarProps> = p => {
   return (
      <div id='lsidebar'>
         <RoundButton icon="fa-tachometer" text="Home" />
         <RoundButton icon="fa-book" text="Ledger" selected={true}/>
         <RoundButton icon="fa-balance-scale" text="Budget" />
         <RoundButton icon="fa-bank" text="Investments" />
         <RoundButton icon="fa-pie-chart" text="Reports" />
         <h3>Favorite reports</h3>
         <RoundButton icon="fa-line-chart" text="Custom 1" />
         <RoundButton icon="fa-line-chart" text="Custom 2" />
      </div>
   );
}

export default LeftSideBar;
