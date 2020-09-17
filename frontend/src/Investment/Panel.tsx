import * as React from 'react';
import { VariableSizeList } from 'react-window';
import { SetHeaderProps } from 'Dashboard/Panel';
import * as d3TimeFormat from 'd3-time-format';
import * as d3Array from 'd3-array';
import { formatDate } from 'Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from 'Numeric';
import useAccounts, { AccountId, AccountList } from 'services/useAccounts';
import AccountName from 'Account';
import Spinner from 'Spinner';
import { AreaChart, XAxis, YAxis, Area, Tooltip,
         ReferenceLine } from 'recharts';
import './Investment.scss';


//  When do we consider a number of shares to be zero (for rounding errors)
const THRESHOLD = 0.00000001;

type ClosePrice = [/*timestamp*/ number|null, /*close*/ number|null];

interface Ticker {
   id: string;
   name: string;
   ticker: string;
   source: string;

   storedtime: string;   // timestamp of last stored price
   storedprice: number|null;

   // sorted chronologically
   prices: ClosePrice[];
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

const bisect = d3Array.bisector((d: ClosePrice) => d[0]).left;

interface HistoryProps {
   ticker: Ticker;
   accs: AccountTicker[];
   showWALine?: boolean;
   showACLine?: boolean;
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

   const m6idx = ts === null ? undefined : bisect(pr, ts - 86400000 * 365 / 2);
   const m6price = m6idx === undefined ? undefined : pr[m6idx][1];
   const m6perf = m6price ? (close / m6price - 1) * 100 : undefined;
   const m6ts = m6idx === undefined ? null : pr[m6idx]?.[0];
   const m6date = m6ts ? formatDate(new Date(m6ts)) : undefined;

   const y1idx = ts === null ? undefined : bisect(pr, ts - 86400000 * 365);
   const y1price = y1idx === undefined ? undefined : pr[y1idx][1];
   const y1perf = y1price ? (close / y1price - 1) * 100 : undefined;
   const y1ts = y1idx === undefined ? null : pr[y1idx]?.[0];
   const y1date = y1ts ? formatDate(new Date(y1ts)) : undefined;

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
                         allowEscapeViewBox={{x: true, y: true}}
                         isAnimationActive={false}
                     />
                     {
                        p.showWALine &&
                        p.accs.map(a =>
                           <ReferenceLine
                               key={`${a.account}-wa`}
                               y={a.absvalue / a.absshares}
                               stroke="var(--cartesian-grid)"
                               strokeDasharray="3 3"
                               isFront={true}
                           />
                        )
                     }
                     {
                        p.showACLine &&
                        p.accs.map(a =>
                           <ReferenceLine
                               key={`${a.account}-ac`}
                               y={a.value / a.shares}
                               stroke="var(--cartesian-grid)"
                               strokeDasharray="3 3"
                               isFront={true}
                           />
                        )
                     }
                     <Area
                         type="linear"
                         dataKey="price"
                         isAnimationActive={false}
                         connectNulls={true}
                         stroke="none"
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
                  <th title={`From ${y1date} to ${date}`} >
                     1y
                  </th>
                  <th title={`From ${m6date} to ${date}`} >
                     6m
                  </th>
                  <th title={`From ${prevDate} to ${date}`} >
                     { days }d
                  </th>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <td title={`${p.ticker.storedprice} -> ${close}`} >
                    <Numeric amount={storedVariation} colored={true} unit="%"/>
                  </td>
                  <td>
                     <Numeric amount={y1perf} colored={true} unit="%"/>
                  </td>
                  <td>
                     <Numeric amount={m6perf} colored={true} unit="%"/>
                  </td>
                  <td title={`${prevClose} -> ${close}`}>
                     <Numeric amount={variation} colored={true} unit="%" />
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
              a.absshares > THRESHOLD && weighted_avg !== 0
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
                    &nbsp;(
                    <Numeric
                       amount={(close / weighted_avg - 1) * 100}
                       unit="%"
                    />
                    )
                 </td>
              </tr>
            ) : null
           }
           {
              Math.abs(a.shares) > THRESHOLD && avg_cost !== 0
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
                    &nbsp;(
                    <Numeric
                       amount={(close / avg_cost - 1) * 100}
                       unit="%"
                    />
                    )
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
   showWALine?: boolean;
   showACLine?: boolean;
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
               <History
                  ticker={p.ticker}
                  accs={at}
                  showWALine={p.showWALine}
                  showACLine={p.showACLine}
               />
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
   showWALine?: boolean;
   showACLine?: boolean;
}

const InvestmentsPanel: React.FC<InvestmentsPanelProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const { accounts } = useAccounts();
   const list = React.useRef<VariableSizeList>(null);

   const [response, setResponse] = React.useState<Response|undefined>();

   const accTick = React.useMemo(
      () =>
         response === undefined
         ? undefined
         : p.hideIfNoShare
         ? response[1].filter(a => Math.abs(a.shares) > THRESHOLD)
         : response[1],
      [p.hideIfNoShare, response]
   );
   const tickers = React.useMemo(
      () =>
         response === undefined
         ? undefined
         : p.hideIfNoShare
         ? response[0].filter(t => accountsForTicker(t, accTick!).length > 0)
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
            tickers === undefined
            ? <Spinner />
            : tickers.map(t =>
               <TickerView
                  key={t.id}
                  ticker={t}
                  accounts={accounts}
                  accountTickers={accTick!}
                  showWALine={p.showWALine}
                  showACLine={p.showACLine}
               />
            )
         }
      </div>
   );
}

export default InvestmentsPanel;
