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
   currencyId: CommodityId,  // what currency should prices be given in
   fromProviders: boolean,   // whether to load prices from source provides
   hideIfNoShare?: boolean,  // ignore commodities not owned by user
   commodity?: CommodityId,  // restrict to some specific commodities
   skip?: boolean,           // if true, do not fetch anything
) => {
   const { accounts } = useAccounts();
   const [json, setJson] = React.useState<TickerJSON[]>([]);
   const [tickers, setTickers] = React.useState<Ticker[]>([]);

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/quotes?update=${fromProviders}&currency=${currencyId}`
               + (commodity ? `&commodities=${commodity}` : '')
            );
            const data: TickerJSON[] = await resp.json();
            setJson(data);
         }

         if (!skip) {
            dofetch();
         }
      },
      [fromProviders, currencyId, commodity, skip]
   );

   React.useEffect(
      () => {
         const accs = json.map(t => ({
            ...t,
            accounts: t.accounts.map(a => ({
               ...a,
               account: accounts.getAccount(a.account),
            }))
            .filter(a => !hideIfNoShare || Math.abs(a.shares) > THRESHOLD)
         })).filter(t => !hideIfNoShare || t.accounts.length > 0);

         setTickers(accs);
      },
      [json, accounts, hideIfNoShare]
   );

   return tickers;
}

export default useTickers;
