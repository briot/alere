import * as React from 'react';
import usePrefs from '../services/usePrefs';
import Spinner from 'Spinner';
import TickerPanel from 'Ticker/Panel';
import {
   accountsForTicker, THRESHOLD, Ticker, AccountTicker } from 'Ticker/View';
import useAccounts from 'services/useAccounts';
import './Investments.scss';

type TickerList = [Ticker[], AccountTicker[]];

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
   const { accounts } = useAccounts();
   const [tickers, setTickers] = React.useState<Ticker[]|undefined>(undefined);
   const [acctick, setAcctick] = React.useState<AccountTicker[]>([]);

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/quotes?update=${p.update}&currency=${prefs.currencyId}`);
            const data: TickerList = await resp.json();
            const accTick =
               data === undefined
               ? []
               : p.hideIfNoShare
               ? data[1].filter(a => Math.abs(a.shares) > THRESHOLD)
               : data[1];

            setAcctick(accTick);
            setTickers(
               data === undefined
               ? []
               : p.hideIfNoShare
               ? data[0].filter(t => accountsForTicker(t, accTick).length > 0)
               : data[0]
            );
         }
         dofetch();
      },
      [p.update, p.refresh, prefs.currencyId, p.hideIfNoShare]
   );

   return (
      <div className="investments">
         {
            tickers === undefined
            ? <Spinner />
            : tickers.map(t =>
               <TickerPanel
                  key={t.id}
                  excludeFields={[]}
                  save={() => {}}
                  props={{
                     type: 'ticker',
                     colspan: 1,
                     rowspan: 1,
                     ticker: t,
                     accounts,
                     accountTickers: acctick,
                     showWALine: p.showWALine,
                     showACLine: p.showACLine,
                  }}
               />
            )
         }
      </div>
   );
}
export default Investments;
