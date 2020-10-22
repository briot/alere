import * as React from 'react';
import usePrefs from '../services/usePrefs';
import { TickerPanelProps } from 'Ticker/Panel';
import { DashboardFromPanels } from 'Dashboard';
import {
   accountsForTicker, THRESHOLD, Ticker, AccountTicker } from 'Ticker/View';
import { CommodityId } from 'services/useAccounts';
import './Investments.scss';

type TickerList = [Ticker[], AccountTicker[]];

const useTickers = (
   currencyId: CommodityId,
   fromProviders?: boolean, // whether to load price history from source provides
   hideIfNoShare?: boolean,
) => {
   const [tickers, setTickers] = React.useState<Ticker[]>([]);
   const [acctick, setAcctick] = React.useState<AccountTicker[]>([]);

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/quotes?update=${fromProviders}&currency=${currencyId}`);
            const data: TickerList = await resp.json();
            const accTick =
               hideIfNoShare
               ? data[1].filter(a => Math.abs(a.shares) > THRESHOLD)
               : data[1];
            setAcctick(accTick);
            setTickers(
               hideIfNoShare
               ? data[0].filter(t => accountsForTicker(t, accTick).length > 0)
               : data[0]
            );
         }
         dofetch();
      },
      [fromProviders, currencyId, hideIfNoShare]
   );

   return {tickers, acctick};
}

/**
 * Show all the user's investments
 */

export interface InvestmentsProps {
   hideIfNoShare: boolean;
   showWALine: boolean;
   showACLine: boolean;
}
interface ExtraProps {
   update?: boolean;
   //  Whether to download prices from external sources, as opposed to just
   //  from database.

   refresh?: number;
   //  Change this to force loading data again
}
const Investments: React.FC<InvestmentsProps & ExtraProps> = p => {
   const { prefs } = usePrefs();
   const { tickers, acctick } = useTickers(
      prefs.currencyId, p.update, p.hideIfNoShare);

   const doNothing = React.useCallback(() => {}, []);

   const panels = tickers.map(t => (
      {
         type: 'ticker',
         colspan: 1,
         rowspan: 1,
         ticker: t,
         accountTickers: acctick,
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
