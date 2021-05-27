import * as React from 'react';
import { useLocation } from "react-router-dom";
import useAccounts from '@/services/useAccounts';
import useHistory from '@/services/useHistory';
import usePrefs from '@/services/usePrefs';
import { usePages, Disabled } from '@/services/usePages';
import RoundButton from '@/RoundButton';
import './LeftSideBar.scss';

interface LeftSideBarProps {
}

const LeftSideBar: React.FC<LeftSideBarProps> = p => {
   const location = useLocation();
   const { mostRecent } = useHistory();
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const { pages } = usePages();

   const isDisabled = (disabled: Disabled): boolean =>
      (disabled === undefined)           ? false
      : (disabled === 'need_accounts')   ? !accounts.has_accounts()
      : (typeof(disabled) === "boolean") ? disabled
      :                                    disabled();

   return (
      <div id='lsidebar'>
         {
            Object.entries(pages).map(([name, p]) => (
               !p.invisible &&
               <RoundButton
                  key={name}
                  fa={p.fa ?? "fa-pie-chart"}
                  text={name}
                  disabled={isDisabled(p.disabled)}
                  selected={location.pathname === p.url}
                  showText={prefs.text_on_left}
                  size='large'
                  url={p.url}
               />
            ))
         }
         <RoundButton
            fa="fa-book"
            selected={location.pathname.startsWith('/ledger/')}
            disabled={!accounts.has_accounts() || mostRecent === undefined}
            text="Ledger"
            showText={prefs.text_on_left}
            size='large'
            url={`/ledger/${mostRecent}`}
          />
      </div>
   );
}

export default LeftSideBar;
