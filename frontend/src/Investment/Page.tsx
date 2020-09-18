import * as React from 'react';
import InvestmentsPanel, {
   InvestmentsPanelProps, TickerList } from 'Investment/Panel';
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

   const [update, setUpdate] = React.useState(false);
   const [refresh, setRefresh] = React.useState(0);
   const forceUpdate = React.useCallback(
      () => {
         setUpdate(true);
         setRefresh(old => old + 1);
      },
      []
   );

   const [response, setResponse] = React.useState<TickerList|undefined>();
   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/quotes?update=${update}`);
            const data: TickerList = await resp.json();
            setResponse(data);
         }
         dofetch();
      },
      [update, refresh]
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
                     onClick={forceUpdate}
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
      [setHeader, state.val, state.setPartial, forceUpdate ]
   );

   return (
      <div className="main">
         <InvestmentsPanel
            { ...state.val }
            data={response}
         />
      </div>
   );
}

export default InvestmentPage;
