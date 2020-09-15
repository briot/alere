import * as React from 'react';
import { VariableSizeList } from 'react-window';
import { SetHeaderProps } from 'Dashboard/Panel';
import * as d3TimeFormat from 'd3-time-format';
import { formatDate } from 'Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from 'Numeric';
import useAccounts, { AccountId, AccountList } from 'services/useAccounts';
import AccountName from 'Account';
import { AreaChart, XAxis, YAxis, Area, Tooltip } from 'recharts';
import './Investment.scss';


//  When do we consider a number of shares to be zero (for rounding errors)
const THRESHOLD = 0.00000001;


interface Ticker {
   id: string;
   name: string;
   ticker: string;
   source: string;

   storedtime: string;   // timestamp of last stored price
   storedprice: number|null;

   // sorted chronologically
   prices: Array<[/*timestamp*/ number|null, /*close*/ number|null]>;
}

interface AccountTicker {
   account: AccountId;
   security: string;
   absvalue: number;
   absshares: number;
   value: number;
   shares: number;
}

type Response = [Ticker[], AccountTicker[]];

const dateForm = d3TimeFormat.timeFormat("%Y-%m-%d");
const priceForm = (v: number) => v.toFixed(2);
const labelForm = (d: number|string) => <span>{dateForm(new Date(d))}</span>;

const accountsForTicker = (t: Ticker, accTick: AccountTicker[]) =>
     accTick.filter(a => a.security === t.id);

interface HistoryProps {
   ticker: Ticker;
}
const History: React.FC<HistoryProps> = p => {
   const pr = p.ticker.prices;
   const close = pr[pr.length - 1]?.[1] || NaN;
   const ts =pr[pr.length - 1]?.[0] || null;
   const date = ts === null ? '-' : formatDate(new Date(ts));

   const prevClose = pr[pr.length - 2]?.[1] || NaN;
   const prevTs = pr[pr.length - 2]?.[0] || null;
   const prevDate = prevTs === null ? '-' : formatDate(new Date(prevTs));

   const hist = pr.map(r => ({t: r[0], price: r[1]}));

   const days = ts === null || prevTs === null
      ? null
      : (ts - prevTs) / 86400000;

   const variation = (close / prevClose - 1) * 100;
   const storedVariation = p.ticker.storedprice
      ? (close / p.ticker.storedprice - 1) * 100
      : null;

   return (
   <>
      <div className="hist" title={`Prices from ${p.ticker.source}`}>
         <AutoSizer>
            {
               ({width, height}) => (
                 <AreaChart
                    width={width}
                    height={height}
                    data={hist}
                 >
                     <XAxis
                         dataKey="t"
                         scale="time"
                         type="number"
                         domain={["auto", "auto"]}
                         hide={false}
                         tickFormatter={dateForm}
                     />
                     <YAxis
                         dataKey="price"
                         type="number"
                         domain={["auto", "auto"]}
                         hide={false}
                         orientation="right"
                         tickFormatter={priceForm}
                     />
                     <Tooltip
                         labelFormatter={labelForm}
                         contentStyle={{backgroundColor: "var(--panel-background)"}}
                     />
                     <Area
                         type="linear"
                         dataKey="price"
                         isAnimationActive={false}
                         connectNulls={true}
                         fill={
                            variation > 0
                            ? "var(--positive-fg)"
                            : "var(--negative-fg)"
                          }
                         dot={false}
                     />
                 </AreaChart>
                )
            }
         </AutoSizer>
      </div>

      <div className="prices">
         Closing price:
         <Numeric amount={close} />
         on {date}
      </div>

      <div className="perf">
         <table>
            <thead>
               <tr>
                  <th title={`From ${p.ticker.storedtime} to ${date}`} >
                      Since last stored
                  </th>
                  <th title={`From ${prevDate} to ${date}`} >
                     { days }d
                  </th>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <td title={`${p.ticker.storedprice} -> ${close}`} >
                    <Numeric amount={storedVariation} colored={true} />%
                  </td>
                  <td title={`${prevClose} -> ${close}`}>
                     <Numeric amount={variation} colored={true} />%
                  </td>
               </tr>
            </tbody>
         </table>
      </div>
   </>
   );
}

interface AccTickerProps {
   ticker: Ticker;
   acc: AccountTicker;
   accounts: AccountList;
}

const AccTicker: React.FC<AccTickerProps> = p => {
   const a = p.acc;
   const account = p.accounts.getAccount(a.account);
   const pr = p.ticker.prices;
   const close = pr[pr.length - 1]?.[1] || NaN;
   const weighted_avg = a.absvalue / a.absshares;
   const avg_cost = a.value / a.shares;
   return (
   <div className="account">
      <div>
         <AccountName
            id={a.account}
            account={account}
            fullName={true}
         />
      </div>

      <table>
         <tbody>
            <tr>
               <th>Shares owned:</th>
               <td>
                  <Numeric amount={a.shares} />
               </td>
            </tr>
           {
              a.absshares > THRESHOLD
              ? (
              <tr>
                 <th
                    title="Weighted Average: average price at which you sold or bought shares. It does not include shares added or subtracted with no paiement."
                 >
                    Weighted Average:
                 </th>
                 <td>
                    <Numeric
                       amount={weighted_avg}
                       className={
                          weighted_avg >= close ? 'negative' : 'positive'
                       }
                    />
                 </td>
              </tr>
            ) : null
           }
           {
              Math.abs(a.shares) > THRESHOLD
              ? (
              <tr>
                 <th
                    title="Average Cost: equivalent price for the remaining shares you own, taking into account dividends, added and removed shares,..."
                 >
                    Average Cost:
                 </th>
                 <td>
                    <Numeric
                       amount={avg_cost}
                       className={
                          avg_cost >= close ? 'negative' : 'positive'
                       }
                    />
                 </td>
              </tr>
              ) : null
           }
         </tbody>
      </table>
   </div>
   );
}


interface TickerViewProps {
   accounts: AccountList;
   ticker: Ticker;
   accountTickers: AccountTicker[];
}

const TickerView: React.FC<TickerViewProps> = p => {
   const at = accountsForTicker(p.ticker, p.accountTickers);
   return (
      <div className="tickerPanel panel" >
         <div className="header">
            <h5 title={`Ticker: ${p.ticker.ticker}`} >
              {p.ticker.name}
            </h5>
         </div>
         <div className="content">
            {
               p.ticker.prices.length > 0 &&
               <History ticker={p.ticker} />
            }

            {
               at.map(a =>
                  <AccTicker
                     key={a.account}
                     ticker={p.ticker}
                     acc={a}
                     accounts={p.accounts}
                  />
               )
            }
         </div>
      </div>
   );
}

export interface InvestmentsPanelProps {
   hideIfNoShare?: boolean;
}

const InvestmentsPanel: React.FC<InvestmentsPanelProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const { accounts } = useAccounts();
   const list = React.useRef<VariableSizeList>(null);

   const [response, setResponse] = React.useState<Response>([[], []]);

   const accTick = React.useMemo(
      () => p.hideIfNoShare
         ? response[1].filter(a => Math.abs(a.shares) > THRESHOLD)
         : response[1],
      [p.hideIfNoShare, response]
   );
   const tickers = React.useMemo(
      () => p.hideIfNoShare
         ? response[0].filter(t => accountsForTicker(t, accTick).length > 0)
         : response[0],
      [p.hideIfNoShare, accTick, response]
   );

   React.useEffect(
      () => list.current?.resetAfterIndex(0),
      [tickers]
   );

   React.useEffect(
      () => setHeader?.('Investments'),
      [setHeader]
   );

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch('/api/quotes');
            const data: Response = await resp.json();
            setResponse(data);
         }
         dofetch();
      },
      []
   );

   return (
      <div className="investment">
         {
            tickers.map(t =>
               <TickerView
                  key={t.id}
                  ticker={t}
                  accounts={accounts}
                  accountTickers={accTick}
               />
            )
         }
      </div>
   );
}

export default InvestmentsPanel;
