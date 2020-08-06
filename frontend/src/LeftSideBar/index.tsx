import * as React from 'react';
import { useLocation } from "react-router-dom";
import RoundButton from 'RoundButton';
import './LeftSideBar.css';

interface LeftSideBarProps {
}

const LeftSideBar: React.FC<LeftSideBarProps> = p => {
   const location = useLocation();

   return (
      <div id='lsidebar'>
         <RoundButton
            fa="fa-tachometer"
            selected={location.pathname.startsWith('/dashboard')}
            text="Overview"
            url="/dashboard"
         />
         <RoundButton fa="fa-money" text="Accounts" disabled={true}/>
         <RoundButton
            fa="fa-book"
            selected={location.pathname.startsWith('/ledger/')}
            text="Ledger"
            url="/ledger/1"
          />
         <RoundButton fa="fa-balance-scale" text="Budget" disabled={true}/>
         <RoundButton fa="fa-bank" text="Investments" disabled={true}/>
         <RoundButton fa="fa-pie-chart" text="Reports" disabled={true}/>
         <h3>Favorite reports</h3>
         <RoundButton fa="fa-line-chart" text="Custom 1" disabled={true}/>
         <RoundButton fa="fa-area-chart" text="Custom 2" disabled={true}/>
      </div>
   );
}

export default LeftSideBar;
