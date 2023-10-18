import * as React from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { THRESHOLD, Ticker } from '@/Ticker/types';
import { ClosePrice } from '@/PriceGraph';
import { DateRange, toDates } from '@/Dates';
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
   accounts: AccountId[];
}

interface ForAccountJSON {
   account: AccountId;
   start: PositionJSON;
   end: PositionJSON;
   oldest: string | undefined;
   most_recent: string | undefined;
   now_for_annualized: string;
   annualized_roi: number | null;
   period_roi: number | null;  // null for NaN

   // sorted chronologically, given in the currency used in the query
   prices: ClosePrice[];
}

type FullJSON = [
   TickerJSON[],
   Record<AccountId, ForAccountJSON>,
];

const useTickers = (
   currencyId: CommodityId,  // what currency should prices be given in
   accountIds: AccountIdSet, // restrict to a specific set of accounts
   range: DateRange = "all",
   hideIfNoShare?: boolean,  // ignore commodities not owned by user
   commodity?: CommodityId,  // restrict to some specific commodities
   skip?: boolean,           // if true, do not fetch anything
): Ticker[] => {
   const { accounts } = useAccounts();
   const accs = useAccountIds(accountIds);
   const nan_dec = (n: number|null) => n === null ? NaN : n;

   const args = React.useMemo(
      () => {
         const r = toDates(range);
         return {
            currency: currencyId,
            commodities: commodity,
            accounts: accs.accounts.map(a => a.id),
            mindate: r[0],
            maxdate: r[1],
         };
      },
      [currencyId, range, commodity, accs.accounts]
   );

   const tickers = useFetch({
      cmd: 'quotes',
      args,
      enabled: !skip,
      options: {
         placeholderData: keepPreviousData,
      },
      parse: (json: FullJSON) => {
         return json[0].map(t => ({
            id: t.id,
            ticker: t.ticker,
            source: t.source,
            is_currency: t.is_currency,
            accounts: t.accounts.map(id => {
               const a: ForAccountJSON = json[1][id];
               return {
                  account: accounts.getAccount(a.account),
                  period_roi: nan_dec(a.period_roi),
                  annualized_roi: nan_dec(a.annualized_roi),
                  oldest_transaction: new Date(a.oldest ?? 0),
                  most_recent_transaction: new Date(a.most_recent ?? 0),
                  now_for_annualized: new Date(a.now_for_annualized),
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
               };
            }),
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
                     || (f.is_currency && Math.abs(a.end.equity) > THRESHOLD)
                     || (!f.is_currency && Math.abs(a.end.shares) > THRESHOLD)),
            })).filter(t => !hideIfNoShare || t.accounts.length > 0));
      },
      [tickers.data, hideIfNoShare],
   );

   return filtered;
}

export default useTickers;
