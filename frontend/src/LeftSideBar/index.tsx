import * as React from 'react';
import { useLocation } from "react-router-dom";
import useAccounts from '@/services/useAccounts';
import usePrefs from '@/services/usePrefs';
import { usePages, Disabled } from '@/services/usePages';
import RoundButton from '@/RoundButton';
import './LeftSideBar.scss';

interface LeftSideBarProps {
}

const LeftSideBar: React.FC<LeftSideBarProps> = p => {
   const location = useLocation();
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const { allVisiblePages } = usePages();

   const isDisabled = (disabled: Disabled): boolean =>
      (disabled === undefined)           ? false
      : (disabled === 'need_accounts')   ? !accounts.has_accounts()
      : (typeof(disabled) === "boolean") ? disabled
      :                                    disabled();

   return (
      <div id='lsidebar'>
         {
            allVisiblePages().map(p => (
               <RoundButton
                  key={p.url}
                  fa={p.fa ?? "fa-pie-chart"}
                  text={prefs.text_on_left ? p.name : undefined}
                  tooltip={p.tooltip}
                  disabled={isDisabled(p.disabled)}
                  selected={location.pathname === p.url}
                  size='large'
                  url={p.url}
               />
            ))
         }
      </div>
   );
}

export default LeftSideBar;
