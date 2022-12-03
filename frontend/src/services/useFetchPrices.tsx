import { AccountId, CommodityId } from '@/services/useAccounts';
import useFetch from '@/services/useFetch';

interface Price {
   date: string;
   price: number;
}

const NO_PRICES: Price[] = [];

const useFetchPrices = (
   accountId: AccountId,
   currencyId: CommodityId,
) => {
   const { data } = useFetch<Price[], unknown, {}>({
      cmd: 'prices',
      args: {
         account: accountId,
         currency: currencyId,
      },
   });

   return data ?? NO_PRICES;
}
export default useFetchPrices;
