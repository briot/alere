import * as React from 'react';
import * as d3TimeFormat from 'd3-time-format';
import * as d3Array from 'd3-array';
import { DateDisplay } from 'Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from 'Numeric';
import { Account, CommodityId } from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import { DAY_MS, humanDateInterval } from 'services/utils';
import AccountName from 'Account';
import { AreaChart, XAxis, YAxis, Area, Tooltip,
         ReferenceLine } from 'recharts';
import './Ticker.scss';

//  When do we consider a number of shares to be zero (for rounding errors)
export const THRESHOLD = 0.00000001;

export type ClosePrice = [/*timestamp*/ number, /*close*/ number];

interface Position {
   absvalue: number;
   absshares: number;
   value: number;    //  how much we invested (including dividends)
   shares: number;
}

export interface AccountForTicker {
   account: Account;
   start: Position; // at mindate
   end: Position;   // at maxdate
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

/**
 * Compute the price of a security at some time in the past
 */

export const dateForm = d3TimeFormat.timeFormat("%Y-%m-%d");
const priceForm = (v: number) => v.toFixed(2);
const labelForm = (d: number|string) => <span>{dateForm(new Date(d))}</span>;
const bisect = d3Array.bisector((d: ClosePrice) => d[0]).right;

interface PastValue  {
   fromDate: Date|undefined;
   fromPrice: number;   // price as of fromDate (the requested one)

   toDate: Date|undefined;
   toPrice: number;     // latest known price

   commodity: CommodityId;
   show_perf: boolean;

   header: string;
   // human-readable description of the date.
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
      header: humanDateInterval(ms),
      show_perf: ms !== 0,
   };
}

/**
 * Compute various performance indicators for a security
 */

export interface ComputedTicker {
   close: number;     // most recent closing price
   weighted_avg: number;
   avg_cost: number;
   worth: number;
   invested: number;  // total invested
   oldest: Date;   // date of first investment
   latest: Date;   // date of most recent investmnet
   annualized_return: number;
   annualized_return_recent: number;
}

export const computeTicker = (
   ticker: Ticker,
   a: AccountForTicker,
   atEnd: boolean,
   ms_elapsed: number,
): ComputedTicker => {
   const price = pastValue(ticker, ms_elapsed);
   const worth =
      atEnd
      ? a.end.shares * price.toPrice
      : a.start.shares * price.fromPrice;
   const invested = a.end.value;
   const oldest = new Date(a.oldest * 1000);
   const latest = new Date(a.latest * 1000);
   return {
      close: price.toPrice || ticker.storedprice || NaN,
      weighted_avg:
         atEnd
         ? a.end.absvalue / a.end.absshares
         : a.start.absvalue / a.start.absshares,
      avg_cost:
         atEnd
         ? a.end.value / a.end.shares
         : a.start.value / a.start.shares,
      worth,
      invested,
      oldest,
      latest,
      annualized_return: (
         Math.pow(
            worth / invested,
            365 * DAY_MS / (new Date().getTime() - oldest.getTime()))
         - 1) * 100,
      annualized_return_recent: (
         Math.pow(
            worth / invested,
            365 * DAY_MS / (new Date().getTime() - latest.getTime()))
         - 1) * 100,
   };
}

const PastHeader: React.FC<PastValue> = p => {
   return (
      <th>
         {p.header}
      </th>
   );
}

const Past: React.FC<PastValue> = p => {
   const perf = (p.toPrice / p.fromPrice - 1) * 100;
   return (
      !isNaN(perf)
      ? (
      <td>
         <div>
            {
               p.show_perf
               ? <Numeric amount={perf} colored={true} suffix="%"/>
               : <Numeric
                    amount={p.fromPrice}
                    commodity={p.commodity}
                    hideCommodity={true}
                 />
            }
         </div>
         <div className="tooltip">
            <table>
               <tbody>
                  <tr>
                     <td>
                        <DateDisplay when={p.fromDate} />
                     </td>
                     <td>
                        <DateDisplay when={p.toDate} />
                     </td>
                  </tr>
                  <tr>
                     <td>
                        <Numeric
                           amount={p.fromPrice}
                           commodity={p.commodity}
                           hideCommodity={true}
                        />
                     </td>
                     <td>
                        <Numeric
                           amount={p.toPrice}
                           commodity={p.commodity}
                           hideCommodity={true}
                        />
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </td>
      ) : <td />
   );
}


interface HistoryProps {
   ticker: Ticker;
   dateRange: [Date, Date];
   showWALine?: boolean;
   showACLine?: boolean;
}
const History: React.FC<HistoryProps> = p => {
   const xrange = p.dateRange.map(d => d.getTime()) as [number, number];
   const hist =
      p.ticker.prices
      .filter(r => r[0] >= xrange[0] && r[0] <= xrange[1] && r[1] !== null)
      .map(r => ({t: r[0], price: r[1]}))

   const db_from_date = new Date(p.ticker.storedtime);
   const db_to_date = new Date();
   const db_interval = db_to_date.getTime() - db_from_date.getTime();
   const intv = (p.dateRange[1].getTime() - p.dateRange[0].getTime()) / DAY_MS;
   const perf = [
      intv >= 365 * 5 &&
         pastValue(p.ticker, DAY_MS * 365 * 5),   // 5 year perf
      intv >= 365 &&
         pastValue(p.ticker, DAY_MS * 365),       // 1 year perf
      intv >= 365 / 2 &&
         pastValue(p.ticker, DAY_MS * 365 / 2),   // 6 months perf
      Math.abs(intv - 365 / 4) < 4 &&
         pastValue(p.ticker, DAY_MS * 365 / 4),   // 3 months perf
      intv >= 365 / 12 &&
         pastValue(p.ticker, DAY_MS * 365 / 12),  // 1 month perf
      intv >= 5 &&
         pastValue(p.ticker, DAY_MS * 5),         // 5 days perf
      pastValue(p.ticker, DAY_MS),             // 1 day perf
      pastValue(p.ticker, 0),                  // intraday perf
      db_from_date.getTime() !== hist[hist.length - 1].t &&  // from database
         {
            fromDate: db_from_date,
            toDate: db_to_date,
            fromPrice: p.ticker.storedprice ?? NaN,
            toPrice: hist[hist.length - 1].price,
            commodity: p.ticker.id,
            header: `db (${humanDateInterval(db_interval)})`,
            show_perf: true,
         },
   ];

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
                     <defs>
                       <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                         <stop
                            offset="5%"
                            stopColor="var(--ticker-history)"
                            stopOpacity={0.5}
                         />
                         <stop
                            offset="95%"
                            stopColor="var(--ticker-history)"
                            stopOpacity={0.1}
                         />
                       </linearGradient>
                     </defs>
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
                               y={a.end.absvalue / a.end.absshares}
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
                               y={a.end.value / a.end.shares}
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
                         stroke="var(--ticker-history)"
                         fill="url(#colorUv)"
                         dot={false}
                     />
                 </AreaChart>
                )
            }
         </AutoSizer>
      </div>

      <div className="perf">
         <table>
            <thead>
               <tr>
                  {perf.map(p => p && <PastHeader {...p} />)}
               </tr>
            </thead>
            <tbody>
               <tr>
                  {perf.map(p => p && <Past {...p} />)}
               </tr>
            </tbody>
         </table>
      </div>
   </>
   );
}

interface DataItemProps {
   head: React.ReactNode;
   tooltip?: React.ReactNode;
}
const DataItem: React.FC<DataItemProps> = p => {
   return (
      <div className="item">
         <span className="head">
            {p.head}
            { p.tooltip && <div className="tooltip">{p.tooltip}</div> }
         </span>
         <span className="value">{p.children}</span>
      </div>
   );
}

interface PrecomputedProps {
   ticker: Ticker;
   acc: AccountForTicker;
   dateRange: [Date, Date];
   start: ComputedTicker;
   end: ComputedTicker;
   currencyId: CommodityId;
}

const shares_data = (p: PrecomputedProps) =>
   !p.ticker.is_currency &&
   <DataItem head="Shares">
      <Numeric
         amount={p.acc.end.shares}
         commodity={p.acc.account.commodity}
         hideCommodity={true}
      />
   </DataItem>
;

const equity_data = (p: PrecomputedProps) =>
   <DataItem
      head="Equity"
      tooltip="Value of the stock (number of shares multiplied by price)"
   >
       <Numeric amount={p.end.worth} commodity={p.currencyId} />
   </DataItem>
;

const pl_data = (p: PrecomputedProps) =>
   <DataItem
      head="P&L"
      tooltip="Profit and loss (equity minus total amount invested)"
   >
      <Numeric
         amount={p.end.worth - p.acc.end.value}
         commodity={p.currencyId}
         forceSign={true}
      />
   </DataItem>
;

const total_return_data = (p: PrecomputedProps) =>
   // !p.ticker.is_currency
   // && Math.abs(a.end.shares) > THRESHOLD
   <DataItem
       head="Total Ret"
       tooltip={
          <>
             Return on investment since you first invested in this
             commodity (current value&nbsp;
                <Numeric amount={p.end.worth} commodity={p.currencyId} />
             <br/>
             / total invested including withdrawals, dividends,...&nbsp;
             <Numeric amount={p.acc.end.value} commodity={p.currencyId} />)
          </>
       }
    >
       <Numeric
          amount={(p.end.worth / p.acc.end.value - 1) * 100
                   /* or: (worth / a.value - 1) * 100  */
                 }
          colored={true}
          forceSign={true}
          showArrow={true}
          suffix="%"
       />
   </DataItem>
;

const avg_cost_data = (p: PrecomputedProps) =>
   <DataItem
      head="Avg Cost"
      tooltip="Equivalent price for the remaining shares you own, taking into account reinvested dividends, added and removed shares,..."
    >
      <Numeric
         amount={p.end.avg_cost}
         commodity={p.ticker.id}
         hideCommodity={true}
      />
   </DataItem>
;

const period_return_data = (p: PrecomputedProps) =>
   <DataItem
      head="Period Ret"
      tooltip={
         <>
            <p>
            How much we gain over the period, compared to how much
            we invested (initial worth + total invested)
            </p>
            <table className="return">
              <thead>
                 <tr>
                    <td />
                    <th><DateDisplay when={p.dateRange[0]} /></th>
                    <th><DateDisplay when={p.dateRange[1]} /></th>
                 </tr>
              </thead>
              <tbody>
                 <tr>
                     <th>Shares</th>
                     <td>
                        <Numeric
                           amount={p.acc.start.shares}
                           commodity={p.acc.account.commodity}
                           hideCommodity={true}
                        />
                     </td>
                     <td>
                        <Numeric
                           amount={p.acc.end.shares}
                           commodity={p.acc.account.commodity}
                           hideCommodity={true}
                        />
                     </td>
                 </tr>
                 <tr>
                     <th>Value</th>
                     <td>
                        <Numeric
                           amount={p.start.worth}
                           commodity={p.currencyId}
                        />
                     </td>
                     <td>
                        <Numeric
                           amount={p.end.worth}
                           commodity={p.currencyId}
                        />
                     </td>
                 </tr>
                 <tr>
                     <th>Total invested</th>
                     <td>
                        <Numeric
                           amount={p.acc.start.value}
                           commodity={p.currencyId}
                        />
                     </td>
                     <td>
                        <Numeric
                           amount={p.acc.end.value}
                           commodity={p.currencyId}
                        />
                     </td>
                 </tr>
                 <tr>
                     <th>Gains</th>
                     <td>
                        <Numeric
                           amount={p.start.worth - p.acc.start.value}
                           commodity={p.currencyId}
                        />
                     </td>
                     <td>
                        <Numeric
                           amount={p.end.worth - p.acc.end.value}
                           commodity={p.currencyId}
                        />
                     </td>
                 </tr>
              </tbody>
            </table>
         </>
      }
   >
      <Numeric
          amount={(p.end.worth - p.acc.end.value
                   - (p.start.worth - p.acc.start.value))
                  / (p.start.worth + p.acc.end.value - p.acc.start.value) * 100}
          colored={true}
          forceSign={true}
          showArrow={true}
          suffix="%"
      />
   </DataItem>
;

const annualized_return_data = (p: PrecomputedProps) =>
   <DataItem
      head="Annualized Ret"
      tooltip={
         <>
            <p>Since {dateForm(p.end.oldest)}</p>
            <p>Equivalent annualized return (assuming compound
               interest), as if the total amount had been invested
               when the account was initially opened
            </p>
         </>
      }
    >
       <Numeric
          amount={p.end.annualized_return}
          forceSign={true}
          suffix="%"
       />
   </DataItem>
;

const weighted_avg_data = (p: PrecomputedProps) =>
   !p.ticker.is_currency
   && p.acc.end.absshares > THRESHOLD
   && p.end.weighted_avg !== 0
   && (
      <DataItem
         head="Weighted Avg"
         tooltip="Average price at which you sold or bought shares. It does not include shares added or subtracted with no paiement, nor dividends"
      >
         <Numeric
            amount={p.end.weighted_avg}
            commodity={p.ticker.id}
            hideCommodity={true}
         />
      </DataItem>
   );
       //  <Numeric
       //     amount={(end.close / end.weighted_avg - 1) * 100}
       //     forceSign={true}
       //     suffix="%"
       //  />)

const annualized_return_recent = (p: PrecomputedProps) =>
   <DataItem
      head="Annualized Ret Recent"
      tooltip={
         <>
            <p>Since {dateForm(p.end.latest)}</p>
            <p>Equivalent annualized return (assuming compound
               interest), as if the total amount had been invested
               at the time of the last transaction
            </p>
         </>
      }
    >
       <Numeric
          amount={p.end.annualized_return_recent}
          forceSign={true}
          suffix="%"
       />
   </DataItem>
;

interface AccTickerProps {
   ticker: Ticker;
   acc: AccountForTicker;
   dateRange: [Date, Date];
}


const AccTicker: React.FC<AccTickerProps> = p => {
   const { prefs } = usePrefs();
   const data = {
      ...p,
      start: computeTicker(
         p.ticker, p.acc, false /* atEnd */,
         new Date().getTime() - p.dateRange[0].getTime() /* ms_elapsed */,
      ),
      end: computeTicker(
         p.ticker, p.acc, true /* atEnd */, 0 /* ms_elapsed */
      ),
      currencyId: prefs.currencyId,
      dateRange: p.dateRange,
   };
   const items = [
      equity_data(data),
      shares_data(data),
      period_return_data(data),
      total_return_data(data),
      annualized_return_data(data),
      pl_data(data),
      avg_cost_data(data),
      weighted_avg_data(data),
      false && annualized_return_recent(data),
   ];

   return (
   <div className="account">
      <div>
         <AccountName
            id={p.acc.account.id}
            account={p.acc.account}
            fullName={true}
         />
      </div>
      <div className="items">
         {items}
      </div>
   </div>
   );
}


export interface TickerViewProps {
   showWALine: boolean;
   showACLine: boolean;
   dateRange: [Date, Date];
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
               dateRange={p.dateRange}
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
                  dateRange={p.dateRange}
               />
            )
         }
      </>
   );
}
export default TickerView;
