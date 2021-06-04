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
import useSearch from '@/services/useSearch';
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
   const query = useSearch({
      range: p.props.range ?? 'all', // default
   });
   const accountIds = query.accounts.accounts.map(a => a.id);

   // Query is shared with the PriceHistory panel, so performed only once
   const tickers = useTickers(
      prefs.currencyId        /* currencyId */,
      accountIds              /* accountIds */,
      query.range             /* range */,
      false                   /* hideIfNoShare */,
      isNumeric(p.props.ticker)
         ? p.props.ticker as number : undefined /* commodity */,
      p.props.ticker === undefined || !isNumeric(p.props.ticker) /* skip */,
   );

   const tk =
      p.props.ticker === undefined ? undefined
      : isNumeric(p.props.ticker)  ? tickers
      : [p.props.ticker as Ticker];

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
