import * as React from 'react';
import { RowData } from '@/Ticker/types';
import { pastValue } from '@/Ticker/Past';
import { dateForm } from '@/services/utils';
import { DateDisplay } from '@/Dates';
import { Column, LogicalRow } from '@/List/ListWithColumns';
import { CommodityId, nullCommodity } from '@/services/useAccounts';
import Numeric from '@/Numeric';

/**
 * Overall metrics for the whole table. Those are recomputed when the data
 * changes, but not every time we need to refresh the display. This also lets
 * us efficiently compute overall return-on-investment for instance, which
 * requires the aggregation of multiple other columns.
 */
export interface Aggregated {
   currencyId: CommodityId;
   equity: number;
   gains: number;
   invested: number;
   periodPL: number;
   periodROI: number;
   pl: number;
   roi: number;
}

export const aggregate = <T extends Aggregated> (rows: LogicalRow<RowData, T>[]) => {
   const equity = rows.reduce((t, d) => t + d.data.acc.end.equity, 0);
   const start_equity = rows.reduce((t, d) => t + d.data.acc.start.equity, 0);
   const pl = rows.reduce((t, d) => t + d.data.acc.end.pl, 0);
   const invested = rows.reduce((t, d) => t + d.data.acc.end.invested, 0);
   const start_inv = rows.reduce((t, d) => t + d.data.acc.start.invested, 0);
   const gains = rows.reduce((t, d) => t + d.data.acc.end.gains, 0);
   const start_gains = rows.reduce((t, d) => t + d.data.acc.start.gains, 0);
   const periodPL = rows.reduce(
      (t, d) => t + d.data.acc.end.pl - d.data.acc.start.pl, 0);
   return {
      equity,
      gains,
      invested,
      periodPL,
      pl,
      roi: (equity + gains) / invested,
      periodROI:
        (equity + gains - start_gains) / (start_equity + invested - start_inv),
      currencyId: rows[0]?.data.currencyId ?? nullCommodity,
   }
};

/**
 * The data we provide in this package is compatible with a ListWithColumns,
 * but also can be used in other contexts that supports more extensive
 * tooltips.
 */
export interface ColumnType extends Column<RowData, Aggregated> {
   id: string;
   head?: string;   // header, possibly using abbreviations
   title?: string;  // full header
   className?: string;
   cellTitle?: (data: RowData) => React.ReactNode;
   cell: (data: RowData) => React.ReactNode;
   compare?: (left: RowData, right: RowData) => number;
   foot?: (aggregated: Aggregated) => React.ReactNode;
}

const numComp = (n1: number, n2: number) =>
   isNaN(n1) ? -1
   : isNaN(n2) ? 1
   : n1 - n2;

export const columnShares: ColumnType = {
   id: 'Shares',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={r.ticker.is_currency ? NaN : r.acc.end.shares}
         commodity={r.acc.account.commodity}
         hideCommodity={true}
         scale={Math.log10(r.acc.account.commodity_scu)}
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.shares, r2.acc.end.shares),
}

export const columnEquity: ColumnType = {
   id: 'Equity',
   className: 'amount',
   cellTitle: () => "Value of the stock (number of shares multiplied by price)",
   cell: (r: RowData) =>
      <Numeric amount={r.acc.end.equity} commodity={r.currencyId} />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.equity, r2.acc.end.equity),
   foot: (agg: Aggregated|undefined) =>
      <Numeric
         amount={agg?.equity}
         commodity={agg?.currencyId}
         forceSign={true}
         scale={0}
      />,
}

export const columnTotalReturn: ColumnType = {
   id: 'Return',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={(r.acc.end.roi - 1) * 100}
         colored={true}
         forceSign={true}
         showArrow={true}
         suffix='%'
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.roi, r2.acc.end.roi),
   foot: (agg: Aggregated|undefined) =>
      <Numeric
         amount={((agg?.roi ?? NaN) - 1) * 100}
         colored={true}
         forceSign={true}
         showArrow={true}
         suffix='%'
      />,
   cellTitle: (r: RowData) => (
      <>
         <p>
         Return on investment since you first invested in this
         commodity
         </p>
         <p>(equity + realized gains) / investment</p>
         (<Numeric amount={r.acc.end.equity} commodity={r.currencyId} />
         + <Numeric amount={r.acc.end.gains} commodity={r.currencyId} />)
         / <Numeric amount={r.acc.end.invested} commodity={r.currencyId} />
      </>
   ),
}

export const columnAnnualizedReturn: ColumnType = {
   id: 'Return/year',
   title: 'Annualized Return',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={(r.acc.annualized_roi - 1) * 100}
         forceSign={true}
         suffix='%'
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.annualized_roi, r2.acc.annualized_roi),
   cellTitle: (r: RowData) => (
      <>
         <p>
            From {dateForm(r.acc.oldest_transaction)} to {dateForm(r.acc.now_for_annualized)}
         </p>
         <p>Equivalent annualized return (assuming compound
            interest), as if the total amount had been invested
            when the account was initially opened
         </p>
      </>
   ),
}

export const columnPL: ColumnType = {
   id: 'P&L',
   className: 'amount',
   title: 'Profits and Loss',
   cell: (r: RowData) =>
      <Numeric
         amount={r.acc.end.pl}
         commodity={r.currencyId}
         forceSign={true}
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.pl, r2.acc.end.pl),
   cellTitle: (r: RowData) => "Equity minus total amount invested",
   foot: (agg: Aggregated|undefined) =>
      <Numeric
         amount={agg?.pl}
         commodity={agg?.currencyId}
         forceSign={true}
         scale={0}
      />,
}

export const columnInvested: ColumnType = {
   id: 'Invested',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric amount={r.acc.end.invested} commodity={r.currencyId} />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.invested, r2.acc.end.invested),
   foot: (agg: Aggregated|undefined) =>
      <Numeric
         amount={agg?.invested}
         commodity={agg?.currencyId}
         forceSign={true}
         scale={0}
      />,
}

export const columnGains: ColumnType = {
   id: 'Realized',
   className: 'amount',
   title: 'Realized gain',
   cell: (r: RowData) =>
      <Numeric amount={r.acc.end.gains} commodity={r.currencyId} />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.gains, r2.acc.end.gains),
   foot: (agg: Aggregated|undefined) =>
      <Numeric
         amount={agg?.gains}
         commodity={agg?.currencyId}
         forceSign={true}
         scale={0}
      />,
}

export const columnWeighedAverage: ColumnType = {
   id: 'WAvg',
   title: "Weighted Average",
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={r.ticker.is_currency ? NaN : r.acc.end.weighted_avg}
         commodity={r.ticker.id}
         hideCommodity={true}
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.weighted_avg, r2.acc.end.weighted_avg),
   cellTitle: () =>
     "Average price at which you sold or bought shares. It does not include shares added or subtracted with no paiement, nor dividends",
}

export const columnAverageCost: ColumnType = {
   id: 'Avg Cost',
   title: 'Average Cost',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={r.ticker.is_currency ? NaN : r.acc.end.avg_cost}
         commodity={r.ticker.id}
         hideCommodity={true}
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.avg_cost, r2.acc.end.avg_cost),
   cellTitle: () =>
      "Equivalent price for the remaining shares you own, taking into account reinvested dividends, added and removed shares,...",
}

export const columnPeriodPL: ColumnType = {
   id: 'Period P&L',
   className: 'amount',
   title: 'Profits and Loss for the period',
   cell: (r: RowData) =>
      <Numeric
         amount={r.acc.end.pl - r.acc.start.pl}
         commodity={r.currencyId}
         forceSign={true}
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.pl - r1.acc.start.pl,
              r2.acc.end.pl - r2.acc.start.pl),
   foot: (agg: Aggregated|undefined) =>
      <Numeric
         amount={agg?.periodPL}
         commodity={agg?.currencyId}
         forceSign={true}
         scale={0}
      />,
   cellTitle: (r: RowData) => "Equity minus total amount invested",
}

export const columnLatest: ColumnType = {
   id: "Last",
   title: "Latest known price",
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={
            r.ticker.is_currency
            ? NaN
            : pastValue(r.ticker, r.acc, 0).toPrice }
         commodity={r.currencyId}
      />,
}

export const columnPeriodReturn: ColumnType = {
   id: "Period Ret",
   title: "Return for the period",
   className: 'amount',
   cellTitle: (r: RowData) => (
      <>
         <p>
         How much we gain over the period, compared to how much
         we invested (initial worth + total invested)
         </p>
         <table className="return">
           <thead>
              <tr>
                 <td />
                 <th><DateDisplay when={r.dateRange[0]} /></th>
                 <th><DateDisplay when={r.dateRange[1]} /></th>
              </tr>
           </thead>
           <tbody>
              <tr>
                  <th>Shares</th>
                  <td>
                     <Numeric
                        amount={r.acc.start.shares}
                        commodity={r.acc.account.commodity}
                        hideCommodity={true}
                     />
                  </td>
                  <td>
                     <Numeric
                        amount={r.acc.end.shares}
                        commodity={r.acc.account.commodity}
                        hideCommodity={true}
                     />
                  </td>
              </tr>
              <tr>
                  <th>Equity</th>
                  <td>
                     <Numeric
                        amount={r.acc.start.equity}
                        commodity={r.currencyId}
                     />
                  </td>
                  <td>
                     <Numeric
                        amount={r.acc.end.equity}
                        commodity={r.currencyId}
                     />
                  </td>
              </tr>
              <tr>
                  <th>Total invested</th>
                  <td>
                     <Numeric
                        amount={r.acc.start.invested}
                        commodity={r.currencyId}
                     />
                  </td>
                  <td>
                     <Numeric
                        amount={r.acc.end.invested}
                        commodity={r.currencyId}
                     />
                  </td>
              </tr>
              <tr>
                  <th>Realized Gains</th>
                  <td>
                     <Numeric
                        amount={r.acc.start.gains}
                        commodity={r.currencyId}
                     />
                  </td>
                  <td>
                     <Numeric
                        amount={r.acc.end.gains}
                        commodity={r.currencyId}
                     />
                  </td>
              </tr>
              <tr>
                  <th>Unrealized Gains</th>
                  <td>
                     <Numeric
                        amount={r.acc.start.pl}
                        commodity={r.currencyId}
                     />
                  </td>
                  <td>
                     <Numeric
                        amount={r.acc.end.pl}
                        commodity={r.currencyId}
                     />
                  </td>
              </tr>
           </tbody>
         </table>
      </>
   ),
   cell: (r: RowData) => (
      <Numeric
          amount={(r.acc.period_roi - 1) * 100}
          colored={true}
          forceSign={true}
          showArrow={true}
          suffix="%"
      />
   ),
   foot: (agg: Aggregated|undefined) =>
      <Numeric
         amount={((agg?.periodROI ?? NaN) - 1) * 100}
         colored={true}
         forceSign={true}
         showArrow={true}
         suffix='%'
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.period_roi, r2.acc.period_roi),
}
