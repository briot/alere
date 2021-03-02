import { ClosePrice, THRESHOLD, Ticker } from 'Ticker/types';
import { DateRange, rangeToHttp } from 'Dates';
import useAccounts, { AccountId, CommodityId } from 'services/useAccounts';
import useAccountIds, { AccountIdSet } from 'services/useAccountIds';
import useFetch from 'services/useFetch';

interface PositionJSON {
   avg_cost: number;
   equity: number;
   gains: number;
   invested: number;
   pl: number;
   roi: number;
   shares: number;
   weighted_avg: number;
}

interface TickerJSON {
   id: CommodityId;
   name: string;
   ticker: string;
   source: string;
   is_currency: boolean;

   accounts: {
      account: AccountId;
      start: PositionJSON;
      end: PositionJSON;
      oldest: number;
      annualized_roi: number;
      period_roi: number;

      // sorted chronologically, given in the currency used in the query
      prices: ClosePrice[];
   }[];
}

const useTickers = (
   currencyId: CommodityId,  // what currency should prices be given in
   fromProviders: boolean,   // whether to load prices from source provides
   accountIds: AccountIdSet, // restrict to a specific set of accounts
   range: DateRange = "forever",
   hideIfNoShare?: boolean,  // ignore commodities not owned by user
   commodity?: CommodityId,  // restrict to some specific commodities
   skip?: boolean,           // if true, do not fetch anything
) => {
   const { accounts } = useAccounts();
   const accs = useAccountIds(accountIds);
   const ids = accs.accounts.map(a => a.id).sort().join(',');
   const tickers = useFetch<Ticker[], TickerJSON[]>({
      url: `/api/quotes?update=${fromProviders}&currency=${currencyId}`
         + (commodity ? `&commodities=${commodity}` : '')
         + (ids ? `&accounts=${ids}` : '')
         + `&${rangeToHttp(range)}`,
      enabled: !skip,
      options: {
         keepPreviousData: true,
      },
      parse: (json: TickerJSON[]) => {
         return json.map(t => ({
            ...t,
            accounts: t.accounts.map(a => ({
               ...a,
               account: accounts.getAccount(a.account),
            }))
            .filter(a => !hideIfNoShare
               || t.is_currency
               || Math.abs(a.end.shares) > THRESHOLD)
         })).filter(t => !hideIfNoShare || t.accounts.length > 0);
      },
   });

   return tickers;
}

export default useTickers;
