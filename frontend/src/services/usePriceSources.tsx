import useFetch from '@/services/useFetch';

export interface PriceSource {
   id: number;
   name: string;
}

export type PriceSources = {
   [id: number]: PriceSource,
};

const NO_PRICE_SOURCE: PriceSources = {};

const usePriceSources = (): PriceSources => {
   const { data } = useFetch<PriceSources, unknown, {}>({
      cmd: 'price_source_list',
   });
   return data ?? NO_PRICE_SOURCE;
}
export default usePriceSources;
