import * as React from 'react';
import AccountName from '@/Account';
import { DateRange, toDates } from '@/Dates';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';
import TickerView, { TickerViewProps } from './View';
import { AccountForTicker, Ticker } from '@/Ticker/types';
import { CommodityId } from '@/services/useAccounts';
import { AccountIdSet } from '@/services/useAccountIds';
import useTickers from '@/services/useTickers';
import usePrefs from '@/services/usePrefs';
import useQuery from '@/services/useQuery';
import { isNumeric } from '@/services/utils';

export interface TickerPanelProps extends PanelBaseProps, TickerViewProps {
   type: 'ticker';
   ticker: undefined | Ticker | CommodityId;
   // The ticker to display. It can either have been downloaded already (for
   // instance to pre-load a large number of commodities) or loaded as needed
   // if you provide a CommodityId.
   // If undefined, nothing is shown.

   acc: AccountForTicker|undefined;
   // Which account is managing the ticker (computed automatically if
   // undefined)

   accountIds: AccountIdSet;
   // Restrict to one specific account

   range: DateRange;
}

const TickerPanel: React.FC<PanelProps<TickerPanelProps>> = p => {
   const { prefs } = usePrefs();
   const query = useQuery({
      range: p.props.range ?? 'all', // default
   });
   const accountIds = query.accounts.accounts.map(a => a.id);

   // Query is shared with the PriceHistory panel, so performed only once
   const tickers = useTickers(
      prefs.currencyId        /* currencyId */,
      accountIds              /* accountIds */,
      query.range             /* range */,
      false                   /* hideIfNoShare */,
      undefined               /* commodity */,
          // ??? isNumeric(ticker) ? ticker as number : undefined,
      query.accounts.accounts.length !== 1   /* skip */,
   );

   const ticker = tickers && tickers.length === 1 ? tickers[0] : undefined;

   const tk =
      ticker === undefined ? undefined
      : isNumeric(ticker) ? tickers : [ticker as Ticker];

   if (!tk || !tk.length) {
      return null;
   }

   const acc = p.props.acc ?? tk[0].accounts[0];

   return (
      <Panel
         {...p}
         header={{node: (
            <div>
               <AccountName
                  id={acc.account.id}
                  account={acc.account}
                  fullName={false}
               />
            </div>
         )}}
         Settings={null  /* no menu at all */}
      >
         <TickerView
            {...p.props}
            acc={acc}
            dateRange={toDates(query.range!)}
            ticker={tk[0]}
         />
      </Panel>
   );
}
export const registerTicker = {'ticker': TickerPanel}
