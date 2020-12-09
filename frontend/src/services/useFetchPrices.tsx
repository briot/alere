import { AccountId, CommodityId } from 'services/useAccounts';
import useFetch from 'services/useFetch';

interface Price {
   date: string;
   price: number;
}

const useFetchPrices = (
   accountId: AccountId,
   currencyId: CommodityId,
): Price[] => {
   return useFetch<Price[]>({
      url: `/api/prices/${accountId}?currency=${currencyId}`,
      default: [],
   }).json;
}
export default useFetchPrices;
