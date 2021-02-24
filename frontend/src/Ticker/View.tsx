import * as React from 'react';
import { DateDisplay } from 'Dates';
import Numeric from 'Numeric';
import { CommodityId } from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import { DAY_MS, dateForm } from 'services/utils';
import AccountName from 'Account';
import { AccountForTicker, Ticker, THRESHOLD } from 'Ticker/types';
import { pastValue } from 'Ticker/Past';
import Perfs from 'Ticker/Perf';
import History from 'Ticker/History';
import './Ticker.scss';

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
   <DataItem key="shares" head="Shares">
      <Numeric
         amount={p.acc.end.shares}
         commodity={p.acc.account.commodity}
         hideCommodity={true}
      />
   </DataItem>
;

const equity_data = (p: PrecomputedProps) =>
   <DataItem
      key="equity"
      head="Equity"
      tooltip="Value of the stock (number of shares multiplied by price)"
   >
       <Numeric amount={p.end.worth} commodity={p.currencyId} />
   </DataItem>
;

const pl_data = (p: PrecomputedProps) =>
   <DataItem
      key="pl"
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
       key="total_ret"
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
      key="avg_cost"
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
      key="period_ret"
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
      key="ann_ret"
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
         key="w_avg"
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
      key="ann_ret_rec"
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

export interface TickerViewProps {
   showWALine: boolean;
   showACLine: boolean;
   dateRange: [Date, Date];
   acc: AccountForTicker;
}
interface ExtraProps {
   ticker: Ticker;
}

const TickerView: React.FC<TickerViewProps & ExtraProps> = p => {
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
      period_return_data(data),
      total_return_data(data),
      annualized_return_data(data),
      pl_data(data),
      equity_data(data),
      shares_data(data),
      avg_cost_data(data),
      weighted_avg_data(data),
      false && annualized_return_recent(data),
   ];

   return (
   <>
      <AccountName
         id={p.acc.account.id}
         account={p.acc.account}
         fullName={true}
      />
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
         p.ticker.prices.length > 0 &&
         <div className="perf">
            <Perfs {...p} />
         </div>
      }
      <div className="items">
         {items}
      </div>
   </>
   );
}

export default TickerView;
