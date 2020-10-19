import * as React from 'react';
import { AccountId, CommodityId } from 'services/useAccounts';

interface Price {
   date: string;
   price: number;
}

const useFetchPrices = (
   accountId: AccountId,
   currencyId: CommodityId,
): Price[] => {
   const [prices, setPrices] = React.useState<Price[]>([]);
   React.useEffect(
      () => {
         const doFetch = async () => {
            const resp = await window.fetch(
               `/api/prices/${accountId}?currency=${currencyId}`
            );
            const d: Price[] = await resp.json();
            setPrices(d);
         }
         doFetch();
      },
      [accountId, currencyId]
   );
   return prices;
}
export default useFetchPrices;
