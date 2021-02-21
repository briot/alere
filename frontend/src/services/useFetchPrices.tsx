import { AccountId, CommodityId } from 'services/useAccounts';
import useFetch from 'services/useFetch';

interface Price {
   date: string;
   price: number;
}

const useFetchPrices = (
   accountId: AccountId,
   currencyId: CommodityId,
) => {
   return useFetch<Price[]>({
      url: `/api/prices/${accountId}?currency=${currencyId}`,
      placeholder: [],
   }).data as Price[];
}
export default useFetchPrices;
