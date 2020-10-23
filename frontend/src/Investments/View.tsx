import * as React from 'react';
import usePrefs from '../services/usePrefs';
import { TickerPanelProps } from 'Ticker/Panel';
import { DashboardFromPanels } from 'Dashboard';
import useTickers from 'services/useTickers';
import './Investments.scss';

/**
 * Show all the user's investments
 */

export interface InvestmentsProps {
   hideIfNoShare: boolean;
   showWALine: boolean;
   showACLine: boolean;
   fromProviders: boolean, // whether to load prices from source provides
}
const Investments: React.FC<InvestmentsProps> = p => {
   const { prefs } = usePrefs();
   const tickers = useTickers(prefs.currencyId, p.fromProviders, p.hideIfNoShare);
   const doNothing = React.useCallback(() => {}, []);
   const panels = tickers.map(t => ({
         type: 'ticker',
         colspan: 1,
         rowspan: 1,
         ticker: t,
         showWALine: p.showWALine,
         showACLine: p.showACLine,
      } as TickerPanelProps
   ));

   return (
      <DashboardFromPanels
         panels={panels}
         setPanels={doNothing}
         className="investments"
      />
   );
}
export default Investments;
