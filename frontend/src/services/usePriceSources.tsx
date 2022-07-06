import useFetch from '@/services/useFetch';

export interface PriceSource {
   id: number;
   name: string;
}

export type PriceSources = {
   [id: number]: PriceSource,
};

const usePriceSources = (): PriceSources => {
   const { data } = useFetch<PriceSources, any>({
      url: '/api/price_source/list',
      placeholder: {},
   });
   return data ?? {};
}
export default usePriceSources;
