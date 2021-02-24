import * as React from 'react';
import { toDates, DateRange } from 'Dates';
import usePrefs from '../services/usePrefs';
import { TickerPanelProps } from 'Ticker/Panel';
import { computeTicker } from 'Ticker/Compute';
import { RowData } from 'Ticker/types';
import { DashboardFromPanels } from 'Dashboard';
import AccountName from 'Account';
import ListWithColumns, { Column, LogicalRow } from 'List/ListWithColumns';
import { columnEquity, columnTotalReturn, columnAnnualizedReturn,
   columnAnnualizedReturnRecent, columnPL, columnWeighedAverage,
   columnAverageCost, columnPeriodReturn,
   columnShares, columnInvested } from 'Ticker/Data';
import useTickers from 'services/useTickers';
import './Investments.scss';

/**
 * Show all the user's investments
 */

export interface InvestmentsProps {
   hideIfNoShare: boolean;
   showWALine: boolean;
   showACLine: boolean;
   fromProviders: boolean; // whether to load prices from source provides
   asTable?: boolean;
   range: DateRange;
}

const columnTickerName: Column<RowData, InvestmentsProps> = {
   id: 'Ticker',
   cell: (r: RowData) => r.ticker.name,
   compare: (r1: RowData, r2: RowData) =>
      r1.ticker.name.toLowerCase().localeCompare(r2.ticker.name.toLowerCase()),
}

const columnAccountName: Column<RowData, InvestmentsProps> = {
   id: 'Account',
   cell: (r: RowData) =>
      <AccountName id={r.acc.account.id} account={r.acc.account} fullName={true} />,
   compare: (r1: RowData, r2: RowData) =>
      r1.acc.account.fullName().localeCompare(r2.acc.account.fullName()),
};

// const columnGainLastYear: Column<RowData, InvestmentsProps> = {

const columns: Column<RowData, InvestmentsProps>[] = [
   columnTickerName,
   columnAccountName,
   columnEquity,
   columnShares,
   columnInvested,
   columnPL,
   columnPeriodReturn,
   columnTotalReturn,
   columnAnnualizedReturn,
   columnAnnualizedReturnRecent,
   columnWeighedAverage,
   columnAverageCost,
];

const Investments: React.FC<InvestmentsProps> = p => {
   const { prefs } = usePrefs();
   const { data } = useTickers(
      prefs.currencyId, p.fromProviders,
      'all' /* accountIds */, p.range, p.hideIfNoShare);
   const doNothing = React.useCallback(() => {}, []);
   const [sorted, setSorted] = React.useState('');

   // We compute the date range once for all tickers, so that they all have
   // exactly the same range (otherwise resolving "now" might result in
   // different dates)
   const dateRange = toDates(p.range);

   const rows: LogicalRow<RowData, InvestmentsProps>[] = React.useMemo(
      () => data?.flatMap(ticker => ticker.accounts.map(acc => ({
         key: `${ticker.id}--${acc.account.id}`,
         data: computeTicker(ticker, acc, prefs, dateRange),
      }))) ?? [],
      [data, prefs],
   );

   if (p.asTable) {
      return (
         <ListWithColumns
            className="investmentsTable"
            columns={columns}
            rows={rows}
            settings={p}
            defaultExpand={true}
            indentNested={true}
            sortOn={sorted}
            setSortOn={setSorted}
         />
      );

   } else {
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
            } as TickerPanelProps
            )
         )
      );

      return (
         <DashboardFromPanels
            panels={panels ?? []}
            setPanels={doNothing}
            className="investments"
         />
      );
   }
}
export default Investments;
