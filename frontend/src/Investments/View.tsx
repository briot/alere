import * as React from 'react';
import { toDates, DateRange } from '@/Dates';
import usePrefs from '@/services/usePrefs';
import { TickerPanelProps } from '@/Ticker/Panel';
import { DashboardFromPanels } from '@/Dashboard';
import useTickers from '@/services/useTickers';
import './Investments.scss';

const doNothing = () => {};

/**
 * Show all the user's investments
 */

export interface InvestmentsProps {
   hideIfNoShare: boolean;
   showWALine: boolean;
   showACLine: boolean;
   hideROIGraph?: boolean;
   hidePriceGraph?: boolean;
   range: DateRange;
}

const Investments: React.FC<InvestmentsProps> = p => {
   const { prefs } = usePrefs();
   const data = useTickers(
      prefs.currencyId, 'all' /* accountIds */, p.range, p.hideIfNoShare);

   // We compute the date range once for all tickers, so that they all have
   // exactly the same range (otherwise resolving "now" might result in
   // different dates)
   const dateRange = toDates(p.range);

   const panels = data?.flatMap(
      t => t.accounts.map(
         a => ({
            type: 'ticker',
            colspan: 1,
            rowspan: 1,
            ticker: t,
            acc: a,
            accountIds: 'all',
            range: p.range,
            dateRange: dateRange,
            showWALine: p.showWALine,
            showACLine: p.showACLine,
            hideROIGraph: p.hideROIGraph,
            hidePriceGraph: p.hidePriceGraph,
         } as TickerPanelProps
         )
      )
   ).filter(a => a !== undefined) ?? [];

   panels.sort((a, b) =>
      a.acc!.account.name.localeCompare(b.acc!.account.name));

   return (
      <DashboardFromPanels
         panels={panels}
         setPanels={doNothing}
         className="investments"
      />
   );
}
export default Investments;
