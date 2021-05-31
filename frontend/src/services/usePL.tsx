import { DateRange, rangeToHttp } from '@/Dates';
import { CommodityId } from '@/services/useAccounts';
import useFetch from '@/services/useFetch';

interface Metric {
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

const usePL = (range: DateRange, currencyId: CommodityId) => {
   const { data } = useFetch<Metric, any>({
      url: `/api/metrics?${rangeToHttp(range)}&currency=${currencyId}`,
   });
   return data ?? NULL_METRIC;
}

export default usePL;
