import * as React from 'react';
import Settings from '@/PriceHistory/Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import PriceGraph, { PriceGraphProps } from '@/PriceGraph';
import usePrefs from '@/services/usePrefs';
import useSearch from '@/services/useSearch';
import useTickers from '@/services/useTickers';
import { toDates } from '@/Dates';

export interface PriceHistoryPanelProps extends PanelBaseProps, PriceGraphProps {
   type: 'pricehistory';
}

const PriceHistoryPanel: React.FC<PanelProps<PriceHistoryPanelProps>> = p => {
   const { prefs } = usePrefs();
   const query = useSearch({
      range: 'all',  // default
   });
   const commodity_id =
      query.accounts.accounts && query.accounts.accounts.length === 1
      ? query.accounts.accounts[0].id : -1;
   const tickers = useTickers(
      prefs.currencyId        /* currencyId */,
      query.accountIds        /* accountIds */,
      query.range             /* range */,
      false                   /* hideIfNoShare */,
      undefined               /* commodity */,
      query.accounts.accounts.length !== 1 /* skip */,
   );

   const prices =
      tickers && tickers.length === 1
      ? tickers[0].accounts[0].prices : [];

   if (!prices.length) {
      return null;
   }
   return (
      <Panel
         {...p}
         header={{ name: `Price History` }}
         Settings={
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <PriceGraph
            {...p.props}
            commodity_id={commodity_id}
            dateRange={toDates(query.range!)}
            prices={prices}
            avg_cost={
               tickers && tickers.length === 1
               ? tickers[0].accounts[0].end.avg_cost : NaN
            }
            weighted_avg={
               tickers && tickers.length === 1
               ? tickers[0].accounts[0].end.weighted_avg : NaN
            }
         />
      </Panel>
   );
}

const registerPriceHistory = {'pricehistory': PriceHistoryPanel};
export default registerPriceHistory;
