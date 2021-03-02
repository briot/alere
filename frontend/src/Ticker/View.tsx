import * as React from 'react';
import usePrefs from 'services/usePrefs';
import { AccountForTicker, RowData, Ticker } from 'Ticker/types';
import { computeTicker } from 'Ticker/Compute';
import Perfs from 'Ticker/Perf';
import History from 'Ticker/History';
import { ColumnType, columnEquity, columnTotalReturn,
   columnAnnualizedReturn, columnShares, columnAverageCost, columnPeriodReturn,
   columnWeighedAverage, columnPL, columnInvested } from 'Ticker/Data';
import './Ticker.scss';

const from_col = (c: ColumnType, p: RowData) => {
   const h = typeof(c.head) === 'string' ? c.head : c.id;
   return (
      <div className="item" key={c.id} >
         <span className="head">
            {h}
            { (c.tooltip || c.title) &&
              <div className="tooltip">
                 <div>
                    <b>{c.title ?? h}</b>
                 </div>
                 {
                    c.tooltip?.(p)
                 }
              </div>
            }
         </span>
         <span className="value">
           { c.cell?.(p) }
         </span>
      </div>
   );
}

export interface TickerViewProps {
   showWALine: boolean;
   showACLine: boolean;
   hideHistory?: boolean;
   hideROIGraph?: boolean;
   hidePriceGraph?: boolean;
   dateRange: [Date, Date];
}
interface ExtraProps {
   ticker: Ticker;
   acc: AccountForTicker;
}

const TickerView: React.FC<TickerViewProps & ExtraProps> = p => {
   const { prefs } = usePrefs();
   const data = computeTicker(p.ticker, p.acc, prefs, p.dateRange);
   const columns = [
      columnTotalReturn,
      columnPeriodReturn,
      columnAnnualizedReturn,
      columnPL,
      columnEquity,
      columnShares,
      false ? columnInvested : undefined,
      columnAverageCost,
      columnWeighedAverage,
   ];

   return (
   <>
      {
         !p.hideHistory &&
         <History
            ticker={p.ticker}
            acc={p.acc}
            dateRange={p.dateRange}
            showWALine={p.showWALine}
            showACLine={p.showACLine}
            showPriceGraph={!p.hidePriceGraph}
            showROIGraph={!p.hideROIGraph}
         />
      }
      <div className="perf">
         <Perfs {...p} />
      </div>
      <div className="items">
         {
            columns.map(c => c && from_col(c, data))
         }
      </div>
   </>
   );
}

export default TickerView;
