import * as React from 'react';
import { DateRange, rangeToHttp, toDates } from '@/Dates';
import { CommodityId } from '@/services/useAccounts';
import { useFetchMultiple } from '@/services/useFetch';
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
): Promise<Metric> => invoke('compute_networth', {mindate, maxdate, currency})

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
   const result = useFetchMultiple<Metric, any>(
      ranges.map(r => ({
         url: `/api/metrics?${rangeToHttp(r)}&currency=${currencyId}`,
         placeholder: NULL_METRIC,
      }))
   );
   return result.map(r => r.data ?? NULL_METRIC);
}

export default usePL;
