import * as React from 'react';
import InvestmentsPanel, { InvestmentsPanelProps } from 'Investment/Panel';
import Settings from 'Investment/Settings';
import { SetHeader } from 'Header';
import RoundButton from 'RoundButton';
import Dropdown from '../Form/Dropdown';
import useSettings from '../services/useSettings';

const InvestmentPage: React.FC<SetHeader> = p => {
   const state = useSettings<InvestmentsPanelProps>(
      'investments',
      {
         hideIfNoShare: true,
         showWALine: false,
         showACLine: true,
      }
   );

   const { setHeader } = p;
   React.useEffect(
      () => {
         setHeader({
            title: 'Investments',
            buttons: (
               <>
                  <RoundButton
                     fa='fa-refresh'
                     size='small'
                     title='sync'
                     disabled={true}
                  />
                  <Dropdown
                     className="settings"
                     button={(visible: boolean) =>
                        <RoundButton
                           fa="fa-bars"
                           selected={visible}
                           size='small'
                           title='Settings'
                        />
                     }
                     menu={
                        <form>
                           <Settings
                               {...state.val}
                               setData={state.setPartial}
                           />
                        </form>
                     }
                  />
               </>
            ),
         });
      },
      [setHeader, state.val, state.setPartial ]
   );

   return (
      <div className="main">
         <InvestmentsPanel { ...state.val } />
      </div>
   );
}

export default InvestmentPage;
