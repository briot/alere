import * as React from 'react';
import { DateRange, toDates } from '@/Dates';
import { CommodityId } from '@/services/useAccounts';
import useFetch, { useFetchMultiple } from '@/services/useFetch';

export interface Metric {
   income: number;
   passive_income: number;
   work_income: number;
   expenses: number;
   income_taxes: number;
   other_taxes: number;
   networth: number;
   networth_start: number;
   liquid_assets: number;
   liquid_assets_at_start: number;
   illiquid_delta: number;   // variation of equity for illiquid assets
   liquid_delta: number;     // variation of equity for liquid assets
   networth_delta: number;   // total variation of equity
   cashflow: number;         // Total realized income - Total expenses
   unrealized: number;       // Total unrealized income
}

const NULL_METRIC: Metric = {
   income: NaN,
   passive_income: NaN,
   expenses: NaN,
   work_income: NaN,
   networth: NaN,
   networth_start: NaN,
   liquid_assets: NaN,
   liquid_assets_at_start: NaN,
   income_taxes: NaN,
   other_taxes: NaN,
   illiquid_delta: NaN,
   liquid_delta: NaN,
   networth_delta: NaN,
   unrealized: NaN,
   cashflow: NaN,
};

const usePL = (range: DateRange, currencyId: CommodityId): Metric => {
   const args = React.useMemo(
      () => {
         const r = toDates(range);
         return {
            mindate: r[0],
            maxdate: r[1],
            currency: currencyId,
         };
      },
      [range, currencyId]
   );

   const { data } = useFetch<Metric, unknown, {}>(
      {cmd: 'metrics', args});
   return data ?? NULL_METRIC;
}

export const usePLMultiple = (
   ranges: DateRange[],
   currencyId: CommodityId,
): Metric[]  => {
   const queries = React.useMemo(
      () => ranges.map(r => {
         const rg = toDates(r);
         return {
            cmd: 'metrics',
            args: {
               mindate: rg[0],
               maxdate: rg[1],
               currency: currencyId,
            },
         };
      }),
      [ranges, currencyId]
   );

   const result = useFetchMultiple<Metric, unknown, {}>(queries);
   return result.map(r => r.data ?? NULL_METRIC);
}

export default usePL;
