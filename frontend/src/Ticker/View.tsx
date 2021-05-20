import * as React from 'react';
import usePrefs from '@/services/usePrefs';
import { AccountForTicker, RowData, Ticker } from '@/Ticker/types';
import { computeTicker } from '@/Ticker/Compute';
import Perfs from '@/Ticker/Perf';
import PriceGraph from '@/PriceGraph';
import { ColumnType, columnEquity, columnTotalReturn,
   columnAnnualizedReturn, columnShares, columnAverageCost, columnPeriodReturn,
   columnWeighedAverage, columnPL, columnInvested } from '@/Ticker/Data';
import Tooltip from '@/Tooltip';
import './Ticker.scss';

const rowTooltip = (c: ColumnType) => {
   if (!c.tooltip && !c.title) {
      return undefined;
   }

   return (r: RowData): React.ReactNode =>
      <div>
         <h4>{c.title ?? c.head ?? c.id}</h4>
         {
            c.tooltip?.(r)
         }
      </div>
}

const from_col = (c: ColumnType, p: RowData) => {
   return (
      <Tooltip
         tooltip={rowTooltip(c)}
         tooltipData={p}
         key={c.id}
      >
         <div className="item" >
            <span className="head">
               {c.head ?? c.id}
            </span>
            <span className="value">
              { c.cell?.(p) }
            </span>
         </div>
      </Tooltip>
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
         <PriceGraph
            commodity_id={p.ticker.id}
            prices={p.acc.prices}
            dateRange={p.dateRange}
            showWeightedAverage={p.showWALine}
            showAverageCost={p.showACLine}
            showPrice={!p.hidePriceGraph && !p.ticker.is_currency}
            showROI={!p.hideROIGraph}
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
