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
            selected={location.pathname.startsWith('/dashboard') ||
                      location.pathname === '/'}
            size='large'
            text="Overview"
            url="/dashboard"
         />
         <RoundButton
            fa="fa-money"
            text="Accounts"
            size='large'
            disabled={true}
         />
         <RoundButton
            fa="fa-book"
            selected={location.pathname.startsWith('/ledger/')}
            text="Ledger"
            size='large'
            url="/ledger/1"
          />
         <RoundButton
            fa="fa-balance-scale"
            text="Budget"
            disabled={true}
            size='large'
         />
         <RoundButton
            fa="fa-bank"
            selected={location.pathname.startsWith('/investments/')}
            text="Investments"
            size='large'
            url="/investments/"
          />
         <RoundButton
            fa="fa-user"
            text="Payees"
            disabled={true}
            size='large'
          />
         <RoundButton
            fa="fa-pie-chart"
            text="Reports"
            disabled={true}
            size='large'
         />

         <h3>Favorite reports</h3>

         <RoundButton
            fa="fa-line-chart"
            text="Custom 1"
            disabled={true}
            size='large'
          />
         <RoundButton
            fa="fa-area-chart"
            text="Custom 2"
            disabled={true}
            size='large'
         />
      </div>
   );
}

export default LeftSideBar;
