import * as React from 'react';
import { VariableSizeList } from 'react-window';
import * as d3TimeFormat from 'd3-time-format';
import * as d3Array from 'd3-array';
import { DateDisplay } from 'Dates';
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
   currency: string;

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

export type TickerList = [Ticker[], AccountTicker[]];

const dateForm = d3TimeFormat.timeFormat("%Y-%m-%d");
const priceForm = (v: number) => v.toFixed(2);
const labelForm = (d: number|string) => <span>{dateForm(new Date(d))}</span>;

const accountsForTicker = (t: Ticker, accTick: AccountTicker[]) =>
     accTick.filter(a => a.security === t.id);

const bisect = d3Array.bisector((d: ClosePrice) => d[0]).right;

const DAY_MS = 86400000;

interface PastValue  {
   fromDate: Date|undefined;
   toDate: Date|undefined;
   fromPrice: number;
   toPrice: number;
   number_of_days: number;
   currency: string;
}

const pastValue = (
   ticker: Ticker,
   ms: number,              // how far back in the past
): PastValue => {
   const prices = ticker.prices;
   const now =prices[prices.length - 1]?.[0] || null;
   const close = prices[prices.length - 1]?.[1] || NaN;
   const idx = now === null
      ? undefined
      : Math.max(0, bisect(prices, now - ms) - 1);
   const price = idx === undefined ? undefined : prices[idx][1];
   const ts = idx === undefined ? null : prices[idx]?.[0];
   return {
      fromDate: ts === null ? undefined : new Date(ts),
      toDate: now === null ? undefined : new Date(now),
      fromPrice: price ?? NaN,
      toPrice: close,
      number_of_days: now === null || ts === null ? NaN
         : Math.floor((now - ts) / DAY_MS),
      currency: ticker.currency,
   };
}

const Past: React.FC<PastValue> = p => {
   const perf = (p.toPrice / p.fromPrice - 1) * 100;
   return (
      !isNaN(perf)
      ? (
      <td>
         <Numeric amount={perf} colored={true} unit="%"/>
         <div className="tooltip">
            <div>
               From <DateDisplay when={p.fromDate} />
               &nbsp;to&nbsp;
               <DateDisplay when={p.toDate} />
            </div>
            <div>
               <Numeric amount={p.fromPrice} unit={p.currency} />
               &nbsp;->&nbsp;
               <Numeric amount={p.toPrice} unit={p.currency} />
            </div>
         </div>
      </td>
      ) : <td />
   );
}


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
   const hist = pr.map(r => ({t: r[0], price: r[1]}));

   const d1 = pastValue(p.ticker, DAY_MS);
   const d5 = pastValue(p.ticker, DAY_MS * 5);
   const m6 = pastValue(p.ticker, DAY_MS * 365 / 2);
   const m3 = pastValue(p.ticker, DAY_MS * 365 / 4);
   const y1 = pastValue(p.ticker, DAY_MS * 365);

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
                            d1.fromPrice <= d1.toPrice
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
         <Numeric amount={close} unit={p.ticker.currency} />
         on <DateDisplay when={ts === null ? undefined : new Date(ts)} />
      </div>

      <div className="perf">
         <table>
            <thead>
               <tr>
                  <th>1y</th>
                  <th>6m</th>
                  <th>3m</th>
                  <th>5d</th>
                  <th>{ isNaN(d1.number_of_days)
                        ? '' : `${d1.number_of_days}d`
                      }
                  </th>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <Past {...y1 } />
                  <Past {...m6 } />
                  <Past {...m3 } />
                  <Past {...d5 } />
                  <Past {...d1 } />
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
   const close = pr[pr.length - 1]?.[1] || p.ticker.storedprice || NaN;
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
                    title="Weighted Average: average price at which you sold or bought shares. It does not include shares added or subtracted with no paiement, nor dividends."
                 >
                    Weighted Average:
                 </th>
                 <td>
                    <Numeric
                       amount={weighted_avg}
                       className={
                          weighted_avg > close ? 'negative' : 'positive'
                       }
                       unit={p.ticker.currency}
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
                          avg_cost > close ? 'negative' : 'positive'
                       }
                       unit={p.ticker.currency}
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
           {
              <tr>
                 <th>Latest in database:</th>
                 <td>
                    <Numeric
                        amount={p.ticker.storedprice}
                        unit={p.ticker.currency}
                    />
                    &nbsp;on&nbsp;
                    <DateDisplay when={new Date(p.ticker.storedtime)} />
                    &nbsp;(
                    <Numeric
                       amount={(close / (p.ticker.storedprice || NaN) - 1) * 100}
                       unit="%"
                    />
                    )
                 </td>
               </tr>
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
   showWALine: boolean;
   showACLine: boolean;
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
   hideIfNoShare: boolean;
   showWALine: boolean;
   showACLine: boolean;
}
interface DataProps {
   data: TickerList|undefined;
}

const InvestmentsPanel: React.FC<InvestmentsPanelProps & DataProps> = p => {
   const { accounts } = useAccounts();
   const list = React.useRef<VariableSizeList>(null);

   const accTick = React.useMemo(
      () =>
         p.data === undefined
         ? undefined
         : p.hideIfNoShare
         ? p.data[1].filter(a => Math.abs(a.shares) > THRESHOLD)
         : p.data[1],
      [p.hideIfNoShare, p.data]
   );
   const tickers = React.useMemo(
      () =>
         p.data === undefined
         ? undefined
         : p.hideIfNoShare
         ? p.data[0].filter(t => accountsForTicker(t, accTick!).length > 0)
         : p.data[0],
      [p.hideIfNoShare, accTick, p.data]
   );

   React.useEffect(
      () => list.current?.resetAfterIndex(0),
      [tickers]
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
