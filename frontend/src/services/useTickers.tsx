import * as React from 'react';
import { ClosePrice, THRESHOLD, Ticker } from 'Ticker/View';
import useAccounts, { AccountId, CommodityId } from 'services/useAccounts';

interface TickerJSON {
   id: CommodityId;
   name: string;
   ticker: string;
   source: string;

   storedtime: string;   // timestamp of last stored price
   storedprice: number|null;

   // sorted chronologically, given in the currency used in the query
   prices: ClosePrice[];

   accounts: {
      account: AccountId;
      absvalue: number;
      absshares: number;
      value: number;
      shares: number;
   }[];
}

const useTickers = (
   currencyId: CommodityId,
   fromProviders: boolean, // whether to load prices from source provides
   hideIfNoShare?: boolean,
) => {
   const { accounts } = useAccounts();
   const [tickers, setTickers] = React.useState<Ticker[]>([]);

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/quotes?update=${fromProviders}&currency=${currencyId}`);
            const data: TickerJSON[] = await resp.json();
            const accs = data.map(t => ({
               ...t,
               accounts: t.accounts.map(a => ({
                  ...a,
                  account: accounts.getAccount(a.account),
               }))
               .filter(a => !hideIfNoShare || Math.abs(a.shares) > THRESHOLD)
            })).filter(t => !hideIfNoShare || t.accounts.length > 0);

            setTickers(accs);
         }
         dofetch();
      },
      [fromProviders, currencyId, hideIfNoShare, accounts]
   );

   return tickers;
}

export default useTickers;
