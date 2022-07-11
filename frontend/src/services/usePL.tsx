import * as React from 'react';
import { DateRange, toDates } from '@/Dates';
import { CommodityId } from '@/services/useAccounts';
import { invoke } from '@tauri-apps/api'

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
};

const invokeMetrics = (
       mindate: Date, maxdate: Date, currency: CommodityId
): Promise<Metric> => invoke('metrics', {mindate, maxdate, currency})

const usePL = (range: DateRange, currencyId: CommodityId) => {
   const [metrics, setMetrics] = React.useState(NULL_METRIC);

   React.useEffect(
      () => {
         const r = toDates(range);
         invokeMetrics(r[0], r[1], currencyId)
            .then(resp => setMetrics(resp));
      },
      [range, currencyId]
   );

   return metrics;
}

export const usePLMultiple = (
   ranges: DateRange[],
   currencyId: CommodityId,
): Metric[]  => {
   const [metrics, setMetrics] = React.useState<Metric[]>(
      () => Array(ranges.length).fill(NULL_METRIC),
   );

   React.useEffect(
      () => {
         const promises = ranges.map(r => {
             const dates = toDates(r);
             return invokeMetrics(dates[0], dates[1], currencyId);
         });
         Promise.all(promises).then(values => {
            setMetrics(values);
         });
      },
      [ranges, currencyId],
   );
   return metrics;
}

export default usePL;
