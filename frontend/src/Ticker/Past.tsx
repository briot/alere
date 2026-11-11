import * as d3Array from 'd3-array';
import { CommodityId } from '@/services/useAccounts';
import { AccountForTicker, Ticker } from '@/Ticker/types';
import { ClosePrice } from '@/PriceGraph';
import { humanDateInterval } from '@/services/utils';

const bisect = d3Array.bisector((d: ClosePrice) => d.t).right;

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
   acc: AccountForTicker,
   ms: number,              // how far back in the past
): PastValue => {
   const prices = acc.prices;
   const now = prices[prices.length - 1]?.t || null;
   const close = prices[prices.length - 1]?.price || NaN;
   const idx = now === null
      ? undefined
      : Math.max(0, bisect(prices, now - ms) - 1);
   const price = idx === undefined ? undefined : prices[idx].price;
   const ts = idx === undefined ? null : prices[idx]?.t;

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


