import * as React from 'react';
import * as d3TimeFormat from 'd3-time-format';
import * as d3Array from 'd3-array';
import { DateDisplay } from 'Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from 'Numeric';
import { Account, CommodityId } from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import AccountName from 'Account';
import { AreaChart, XAxis, YAxis, Area, Tooltip,
         ReferenceLine } from 'recharts';
import './Ticker.scss';

//  When do we consider a number of shares to be zero (for rounding errors)
export const THRESHOLD = 0.00000001;

export type ClosePrice = [/*timestamp*/ number|null, /*close*/ number|null];

interface AccountForTicker {
   account: Account;
   absvalue: number;
   absshares: number;
   value: number;
   shares: number;
   balance: number;
   oldest: number;  // date of oldest transaction
   latest: number;  // date of most recent transaction
}

export interface Ticker {
   id: CommodityId;
   name: string;
   ticker: string;
   source: string;
   is_currency: boolean;

   storedtime: string;   // timestamp of last stored price
   storedprice: number|null;

   // sorted chronologically, given in the currency used in the query
   prices: ClosePrice[];
   accounts: AccountForTicker[];
}

const dateForm = d3TimeFormat.timeFormat("%Y-%m-%d");
const priceForm = (v: number) => v.toFixed(2);
const labelForm = (d: number|string) => <span>{dateForm(new Date(d))}</span>;
const bisect = d3Array.bisector((d: ClosePrice) => d[0]).right;
const DAY_MS = 86400000;

interface PastValue  {
   fromDate: Date|undefined;
   toDate: Date|undefined;
   fromPrice: number;
   toPrice: number;
   commodity: CommodityId;
   header?: string;
}

const pastValue = (
   ticker: Ticker,
   ms: number,              // how far back in the past
): PastValue => {
   const prices = ticker.prices;
   const now = prices[prices.length - 1]?.[0] || null;
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
      commodity: ticker.id,
   };
}

const Past: React.FC<PastValue> = p => {
   const perf = (p.toPrice / p.fromPrice - 1) * 100;
   return (
      !isNaN(perf)
      ? (
      <td>
         <Numeric amount={perf} colored={true} suffix="%"/>
         <div className="tooltip">
            <div>
               <DateDisplay when={p.fromDate} />
               &nbsp;&rarr;&nbsp;
               <DateDisplay when={p.toDate} />
            </div>
            <div>
               <Numeric amount={p.fromPrice} commodity={p.commodity} />
               &nbsp;&rarr;&nbsp;
               <Numeric amount={p.toPrice} commodity={p.commodity} />
            </div>
         </div>
      </td>
      ) : <td />
   );
}

const PastHead: React.FC<PastValue> = p => {
   const d = (
      (p.toDate?.getTime() ?? NaN) - (p.fromDate?.getTime() ?? NaN)
   ) / DAY_MS;
   const r = (Math.abs(d - 180) < 10)
      ? '6m'
      : (Math.abs(d - 365) < 10)
      ? '1y'
      : `${Math.floor(d).toFixed(0)}d`;

   return (
      <th>
         {p.header ? `${p.header} (${r})` : r}
      </th>
   );
}


interface HistoryProps {
   ticker: Ticker;
   showWALine?: boolean;
   showACLine?: boolean;
}
const History: React.FC<HistoryProps> = p => {
   const pr = p.ticker.prices;
   const close = pr[pr.length - 1]?.[1] || NaN;
   const ts = pr[pr.length - 1]?.[0] || null;
   const hist = pr.map(r => ({t: r[0], price: r[1]}));

   const d1 = pastValue(p.ticker, DAY_MS);
   const d5 = pastValue(p.ticker, DAY_MS * 5);
   const m6 = pastValue(p.ticker, DAY_MS * 365 / 2);
   const m3 = pastValue(p.ticker, DAY_MS * 365 / 4);
   const y1 = pastValue(p.ticker, DAY_MS * 365);
   const db = {
      fromDate: new Date(p.ticker.storedtime),
      toDate: new Date(),
      fromPrice: p.ticker.storedprice ?? NaN,
      toPrice: d1.toPrice,
      commodity: p.ticker.id,
      header: 'db',
   }

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
                        p.ticker.accounts.map(a =>
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
                        p.ticker.accounts.map(a =>
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
         <Numeric
             amount={close}
             commodity={p.ticker.id}
             hideCommodity={true}
         />
         on <DateDisplay when={ts === null ? undefined : new Date(ts)} />
      </div>

      <div className="perf">
         <table>
            <thead>
               <tr>
                  <PastHead {...y1} />
                  <PastHead {...m6} />
                  <PastHead {...m3} />
                  <PastHead {...d5} />
                  <PastHead {...d1} />
                  {
                     d1.toPrice !== p.ticker.storedprice &&
                     <PastHead {...db} />
                  }
               </tr>
            </thead>
            <tbody>
               <tr>
                  <Past {...y1 } />
                  <Past {...m6 } />
                  <Past {...m3 } />
                  <Past {...d5 } />
                  <Past {...d1 } />
                  {
                     d1.toPrice !== p.ticker.storedprice &&
                     <Past {...db} />
                  }
               </tr>
            </tbody>
         </table>
      </div>
   </>
   );
}

interface AccTickerProps {
   ticker: Ticker;
   acc: AccountForTicker;
}

const AccTicker: React.FC<AccTickerProps> = p => {
   const { prefs } = usePrefs();
   const currencyId = prefs.currencyId;

   const a = p.acc;
   const pr = p.ticker.prices;
   const close = pr[pr.length - 1]?.[1] || p.ticker.storedprice || NaN;
   const weighted_avg = a.absvalue / a.absshares;
   const avg_cost = a.value / a.shares;
   const current_worth = a.balance;
   const oldest = new Date(a.oldest * 1000);
   const latest = new Date(a.latest * 1000);

   return (
   <div className="account">
      <div>
         <AccountName
            id={a.account.id}
            account={a.account}
            fullName={true}
         />
      </div>

      <table>
         <tbody>
            {
               !p.ticker.is_currency &&
               <tr>
                  <th>Shares owned</th>
                  <td>
                     <Numeric amount={a.shares} commodity={a.account.commodity} />
                  </td>
               </tr>
            }
            {
               !p.ticker.is_currency
               && a.absshares > THRESHOLD
               && weighted_avg !== 0
               ? (
               <tr>
                  <th>Weighted Average</th>
                  <td>
                     <Numeric
                        amount={weighted_avg}
                        className={
                           weighted_avg > close ? 'negative' : 'positive'
                        }
                        commodity={p.ticker.id}
                        hideCommodity={true}
                     />
                     &nbsp;(
                     <Numeric
                        amount={(close / weighted_avg - 1) * 100}
                        suffix="%"
                     />
                     )
                     <div className="tooltip">
                        <p>
                        Average price at which you sold or
                        bought shares. It does not include shares added or
                        subtracted with no paiement, nor dividends.
                        </p>
                     </div>
                  </td>
               </tr>
             ) : null
           }
           {
              !p.ticker.is_currency
              && Math.abs(a.shares) > THRESHOLD
              && avg_cost !== 0
              ? (
              <tr>
                 <th>Average Cost</th>
                 <td>
                    <Numeric
                       amount={avg_cost}
                       className={
                          avg_cost > close ? 'negative' : 'positive'
                       }
                       commodity={p.ticker.id}
                       hideCommodity={true}
                    />
                    &nbsp;(
                    <Numeric
                       amount={(close / avg_cost - 1) * 100}
                       suffix="%"
                    />
                    )
                    <div className="tooltip">
                       <p>
                       Equivalent price for the remaining shares
                       you own, taking into account reinvested dividends, added
                       and removed shares,...
                       </p>
                    </div>
                 </td>
              </tr>
              ) : null
           }
           <tr>
              <th>Return</th>
              <td>
                 <Numeric
                     amount={(current_worth / a.value - 1) * 100}
                     suffix="%"
                 />
                 <div className="tooltip">
                    <Numeric
                        amount={a.value}
                        commodity={currencyId}
                    />
                    &rarr;&nbsp;
                    <Numeric
                        amount={current_worth}
                        commodity={currencyId}
                    />
                    <p>
                    Return on Investment: current value / total invested,
                    including withdrawals, dividends,..."
                    </p>
                 </div>
              </td>
            </tr>
            <tr>
               <th>Annualized return</th>
               <td>
                  <Numeric
                     amount={
                        (Math.pow(
                           current_worth / a.value,
                           365 * DAY_MS /
                              (new Date().getTime() - oldest.getTime()))
                           - 1
                        ) * 100
                     }
                     suffix="%"
                  />
                  <div className="tooltip">
                     <p>Since {dateForm(oldest)}</p>
                     <p>Equivalent annualized return (assuming compound
                        interest), as if the total amount had been invested
                        when the account was initially opened
                     </p>
                  </div>
               </td>
            </tr>
            <tr>
               <th>Annualized return recent</th>
               <td>
                  <Numeric
                     amount={
                        (Math.pow(
                           current_worth / a.value,
                           365 * DAY_MS /
                              (new Date().getTime() - latest.getTime()))
                           - 1
                        ) * 100
                     }
                     suffix="%"
                  />
                  <div className="tooltip">
                     <p>Since {dateForm(latest)}</p>
                     <p>Equivalent annualized return (assuming compound
                        interest), as if the total amount had been invested
                        at the time of the last transaction
                     </p>
                  </div>
               </td>
            </tr>
         </tbody>
      </table>
   </div>
   );
}


export interface TickerViewProps {
   showWALine: boolean;
   showACLine: boolean;
}
interface ExtraProps {
   ticker: Ticker;
}

const TickerView: React.FC<TickerViewProps & ExtraProps> = p => {
   return (
      <>
         {
            p.ticker.prices.length > 0 &&
            <History
               ticker={p.ticker}
               showWALine={p.showWALine}
               showACLine={p.showACLine}
            />
         }
         {
            p.ticker.accounts.map(a =>
               <AccTicker
                  key={a.account.id}
                  ticker={p.ticker}
                  acc={a}
               />
            )
         }
      </>
   );
}
export default TickerView;
