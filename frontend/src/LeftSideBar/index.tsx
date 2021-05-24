import * as React from 'react';
import { useLocation } from "react-router-dom";
import useAccounts from '@/services/useAccounts';
import useHistory from '@/services/useHistory';
import usePrefs from '@/services/usePrefs';
import RoundButton from '@/RoundButton';
import './LeftSideBar.scss';

interface LeftSideBarProps {
}

const LeftSideBar: React.FC<LeftSideBarProps> = p => {
   const location = useLocation();
   const { mostRecent } = useHistory();
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();

   return (
      <div id='lsidebar'>
         <RoundButton
            fa="fa-tachometer"
            selected={location.pathname.startsWith('/dashboard') ||
                      location.pathname === '/'}
            size='large'
            text="Overview"
            showText={prefs.text_on_left}
            url="/dashboard"
         />
         <RoundButton
            fa="fa-money"
            selected={location.pathname.startsWith('/accounts/')}
            disabled={!accounts.has_accounts()}
            text="Accounts"
            showText={prefs.text_on_left}
            size='large'
            url="/accounts/"
         />
         <RoundButton
            fa="fa-book"
            selected={location.pathname.startsWith('/ledger/')}
            disabled={!accounts.has_accounts() || mostRecent === undefined}
            text="Ledger"
            showText={prefs.text_on_left}
            size='large'
            url={`/ledger/${mostRecent}`}
          />
         <RoundButton
            fa="fa-balance-scale"
            text="Budget"
            showText={prefs.text_on_left}
            disabled={true}
            size='large'
         />
         <RoundButton
            fa="fa-bank"
            selected={location.pathname.startsWith('/networth/')}
            disabled={!accounts.has_accounts()}
            text="Networth"
            showText={prefs.text_on_left}
            size='large'
            url="/networth/"
          />
         <RoundButton
            fa="fa-bank"
            selected={location.pathname.startsWith('/investments/')}
            disabled={!accounts.has_accounts()}
            text="Investments"
            showText={prefs.text_on_left}
            size='large'
            url="/investments/"
          />
         <RoundButton
            fa="fa-bank"
            selected={location.pathname.startsWith('/performance/')}
            disabled={!accounts.has_accounts()}
            text="Performance"
            showText={prefs.text_on_left}
            size='large'
            url="/performance/"
          />
         <RoundButton
            fa="fa-user"
            text="Payees"
            showText={prefs.text_on_left}
            disabled={true}
            size='large'
          />
         <RoundButton
            fa="fa-pie-chart"
            text="Reports"
            showText={prefs.text_on_left}
            disabled={true}
            size='large'
         />
      </div>
   );
}

export default LeftSideBar;
