import { RowData, THRESHOLD } from 'Ticker/types';
import { dateForm } from 'services/utils';
import { DateDisplay } from 'Dates';
import Numeric from 'Numeric';

/**
 * The data we provide in this package is compatible with a ListWithColumns,
 * but also can be used in other contexts that supports more extensive
 * tooltips.
 */
export interface ColumnType {
   id: string;
   head?: string;   // header, possibly using abbreviations
   title?: string;  // full header
   className?: string;
   tooltip?: (data: RowData) => React.ReactNode;
   cell: (data: RowData) => React.ReactNode;
   compare: (left: RowData, right: RowData) => number;
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
         amount={r.acc.end.shares}
         commodity={r.acc.account.commodity}
         hideCommodity={true}
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.acc.end.shares, r2.acc.end.shares),
}

export const columnEquity: ColumnType = {
   id: 'Equity',
   className: 'amount',
   tooltip: () => "Value of the stock (number of shares multiplied by price)",
   cell: (r: RowData) =>
      <Numeric amount={r.end.worth} commodity={r.currencyId} />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.end.worth, r2.end.worth),
}

export const columnTotalReturn: ColumnType = {
   id: 'Return',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={(r.end.worth / r.end.invested - 1) * 100
                   /* or: (worth / a.value - 1) * 100  */}
         colored={true}
         forceSign={true}
         showArrow={true}
         suffix='%'
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.end.worth / r1.end.invested, r2.end.worth / r2.end.invested),
   tooltip: (r: RowData) => (
      <>
         Return on investment since you first invested in this
         commodity (current value&nbsp;
            <Numeric amount={r.end.worth} commodity={r.currencyId} />
         <br/>
         / total invested including withdrawals, dividends,...&nbsp;
         <Numeric amount={r.end.invested} commodity={r.currencyId} />)
      </>
   ),
}

export const columnAnnualizedReturn: ColumnType = {
   id: 'Ret/y',
   title: 'Annualized Return',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={r.end.annualized_return}
         forceSign={true}
         suffix='%'
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.end.annualized_return, r2.end.annualized_return),
   tooltip: (r: RowData) => (
      <>
         <p>Since {dateForm(r.end.oldest)}</p>
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
         amount={r.end.worth - r.end.invested}
         commodity={r.currencyId}
         forceSign={true}
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.end.worth - r1.end.invested, r2.end.worth - r2.end.invested),
   tooltip: (r: RowData) => "Equity minus total amount invested",
}

export const columnAnnualizedReturnRecent: ColumnType = {
   id: 'RetRec/y',
   title: 'Annualized return since most recent trade',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
        amount={r.end.annualized_return_recent}
        forceSign={true}
        suffix='%'
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.end.annualized_return_recent, r2.end.annualized_return_recent),
   tooltip: (r: RowData) => (
      <>
         <p>Since {dateForm(r.end.latest)}</p>
         <p>Equivalent annualized return (assuming compound
            interest), as if the total amount had been invested
            at the time of the last transaction
         </p>
      </>
   ),
}

export const columnInvested: ColumnType = {
   id: 'Invested',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric amount={r.end.invested} commodity={r.currencyId} />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.end.invested, r2.end.invested),
}

export const columnWeighedAverage: ColumnType = {
   id: 'WAvg',
   title: "Weighted Average",
   className: 'amount',
   cell: (r: RowData) =>
      !r.ticker.is_currency
      && r.acc.end.absshares > THRESHOLD
      && r.end.weighted_avg !== 0
      && <Numeric
         amount={r.end.weighted_avg}
         commodity={r.ticker.id}
         hideCommodity={true}
      />,
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.end.weighted_avg, r2.end.weighted_avg),
   tooltip: () =>
     "Average price at which you sold or bought shares. It does not include shares added or subtracted with no paiement, nor dividends",
}

export const columnAverageCost: ColumnType = {
   id: 'Avg Cost',
   title: 'Average Cost',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={r.end.avg_cost}
         commodity={r.ticker.id}
         hideCommodity={true}
      />,
   compare: (r1: RowData, r2: RowData) => r1.end.avg_cost - r2.end.avg_cost,
   tooltip: () =>
      "Equivalent price for the remaining shares you own, taking into account reinvested dividends, added and removed shares,...",
}

export const columnPeriodReturn: ColumnType = {
   id: "Period Ret",
   title: "Return for the period",
   className: 'amount',
   tooltip: (r: RowData) => (
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
                        amount={r.start.worth}
                        commodity={r.currencyId}
                     />
                  </td>
                  <td>
                     <Numeric
                        amount={r.end.worth}
                        commodity={r.currencyId}
                     />
                  </td>
              </tr>
              <tr>
                  <th>Total invested</th>
                  <td>
                     <Numeric
                        amount={r.acc.start.value}
                        commodity={r.currencyId}
                     />
                  </td>
                  <td>
                     <Numeric
                        amount={r.end.invested}
                        commodity={r.currencyId}
                     />
                  </td>
              </tr>
              <tr>
                  <th>Gains</th>
                  <td>
                     <Numeric
                        amount={r.start.worth - r.start.invested}
                        commodity={r.currencyId}
                     />
                  </td>
                  <td>
                     <Numeric
                        amount={r.end.worth - r.end.invested}
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
          amount={r.periodReturn * 100}
          colored={true}
          forceSign={true}
          showArrow={true}
          suffix="%"
      />
   ),
   compare: (r1: RowData, r2: RowData) =>
      numComp(r1.periodReturn, r2.periodReturn),
}

