import * as React from 'react';
import { THRESHOLD, Ticker } from '@/Ticker/types';
import { ClosePrice } from '@/PriceGraph';
import { DateRange, rangeToHttp } from '@/Dates';
import useAccounts, { AccountId, CommodityId } from '@/services/useAccounts';
import useAccountIds, { AccountIdSet } from '@/services/useAccountIds';
import useFetch from '@/services/useFetch';

interface PositionJSON {
   avg_cost: number | null;  // null for NaN
   equity: number | null;
   gains: number;
   invested: number;
   pl: number | null;
   roi: number | null;
   shares: number;
   weighted_avg: number | null;
}

interface TickerJSON {
   id: CommodityId;
   ticker: string;
   source: number;
   is_currency: boolean;

   accounts: {
      account: AccountId;
      start: PositionJSON;
      end: PositionJSON;
      oldest: number;
      most_recent: number;
      now_for_annualized: number;
      annualized_roi: number | null;
      period_roi: number | null;  // null for NaN

      // sorted chronologically, given in the currency used in the query
      prices: ClosePrice[];
   }[];
}

const useTickers = (
   currencyId: CommodityId,  // what currency should prices be given in
   accountIds: AccountIdSet, // restrict to a specific set of accounts
   range: DateRange = "all",
   hideIfNoShare?: boolean,  // ignore commodities not owned by user
   commodity?: CommodityId,  // restrict to some specific commodities
   skip?: boolean,           // if true, do not fetch anything
) => {
   const { accounts } = useAccounts();
   const accs = useAccountIds(accountIds);
   const ids = accs.accounts.map(a => a.id).sort().join(',');
   const nan_dec = (n: number|null) => n === null ? NaN : n;
   const tickers = useFetch<Ticker[], TickerJSON[]>({
      url: `/api/quotes?currency=${currencyId}`
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
               account: accounts.getAccount(a.account),
               period_roi: nan_dec(a.period_roi),
               annualized_roi: nan_dec(a.annualized_roi),
               oldest_transaction: new Date(a.oldest * 1e3),
               most_recent_transaction: new Date(a.most_recent * 1e3),
               now_for_annualized: new Date(a.now_for_annualized * 1e3),
               prices: a.prices,
               start: {
                  ...a.start,
                  avg_cost: nan_dec(a.start.avg_cost),
                  equity: nan_dec(a.start.equity),
                  pl: nan_dec(a.start.pl),
                  roi: nan_dec(a.start.roi),
                  weighted_avg: nan_dec(a.start.weighted_avg),
               },
               end: {
                  ...a.end,
                  avg_cost: nan_dec(a.end.avg_cost),
                  equity: nan_dec(a.end.equity),
                  pl: nan_dec(a.end.pl),
                  roi: nan_dec(a.end.roi),
                  weighted_avg: nan_dec(a.end.weighted_avg),
               },
            })),
         }));
      },
   });

   const [ filtered, setFiltered ] = React.useState<Ticker[]>([]);

   React.useEffect(
      () => {
         setFiltered((tickers?.data ?? []).map(
            f => ({
               ...f,
               accounts: f.accounts.filter(
                  a => !hideIfNoShare
                     || f.is_currency
                     || Math.abs(a.end.shares) > THRESHOLD),
            })).filter(t => !hideIfNoShare || t.accounts.length > 0));
      },
      [tickers.data, hideIfNoShare],
   );

   return filtered;
}

export default useTickers;
