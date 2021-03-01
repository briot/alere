import * as d3Array from 'd3-array';
import { CommodityId } from 'services/useAccounts';
import { ClosePrice, Ticker } from 'Ticker/types';
import { humanDateInterval } from 'services/utils';

const bisect = d3Array.bisector((d: ClosePrice) => d[0]).right;

export interface PastValue  {
   fromDate: Date|undefined;
   fromPrice: number;   // price as of fromDate (the requested one)

   toDate: Date|undefined;
   toPrice: number;     // latest known price

   commodity: CommodityId;
   show_perf: boolean;

   header: string;
   // human-readable description of the date.
}

export const pastValue = (
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

