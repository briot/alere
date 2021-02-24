import * as React from 'react';
import AccountName from 'Account';
import { DateRange } from 'Dates';
import Panel, { PanelProps, PanelBaseProps, PANELS } from 'Dashboard/Panel';
import TickerView, { TickerViewProps } from './View';
import { AccountForTicker, Ticker } from 'Ticker/types';
import { CommodityId } from 'services/useAccounts';
import { AccountIdSet } from 'services/useAccountIds';
import useTickers from 'services/useTickers';
import usePrefs from 'services/usePrefs';
import { isNumeric } from 'services/utils';

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

   // Download the ticker info, unless ticker is specified and is a Ticker
   const { data } = useTickers(
      prefs.currencyId /* currencyId */,
      false            /* fromProvides */,
      p.props.accountIds  /* accountIds */,
      p.props.range    /* range */,
      false            /* hideIfNoShare */,
      isNumeric(p.props.ticker) ? p.props.ticker as number : undefined,
      p.props.ticker === undefined || !isNumeric(p.props.ticker), /* skip */
   );

   const tk =
      p.props.ticker === undefined ? undefined
      : isNumeric(p.props.ticker)  ? data : [p.props.ticker as Ticker];

   if (!tk || !tk.length) {
      return null;
   }

   const acc = p.props.acc ?? tk[0].accounts[0];

   return (
      <Panel
         {...p}
         header={{name: (
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
            ticker={tk[0]}
         />
      </Panel>
   );
}
export default TickerPanel;
export const registerTicker = () => PANELS['ticker'] = TickerPanel;
