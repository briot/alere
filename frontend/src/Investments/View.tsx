import * as React from 'react';
import { toDates, DateRange } from 'Dates';
import usePrefs from '../services/usePrefs';
import { TickerPanelProps } from 'Ticker/Panel';
import { computeTicker } from 'Ticker/Compute';
import { RowData } from 'Ticker/types';
import { DashboardFromPanels } from 'Dashboard';
import AccountName from 'Account';
import ListWithColumns, { Column, LogicalRow } from 'List/ListWithColumns';
import { ColumnType, columnEquity, columnTotalReturn, columnAnnualizedReturn,
   columnPL, columnWeighedAverage, columnPeriodPL, columnGains,
   columnAverageCost, columnPeriodReturn,
   columnShares, columnInvested } from 'Ticker/Data';
import useTickers from 'services/useTickers';
import usePriceSources from 'services/usePriceSources';
import './Investments.scss';

/**
 * Show all the user's investments
 */

export interface InvestmentsProps {
   hideIfNoShare: boolean;
   showWALine: boolean;
   showACLine: boolean;
   hideROIGraph?: boolean;
   hidePriceGraph?: boolean;
   asTable?: boolean;
   range: DateRange;
}

const columnAccountName: ColumnType = {
   id: 'Account',
   cell: (r: RowData) =>
      <AccountName id={r.acc.account.id} account={r.acc.account} fullName={false} />,
   compare: (r1: RowData, r2: RowData) =>
      r1.acc.account.name.localeCompare(r2.acc.account.name),
};

// const columnGainLastYear: Column<RowData, InvestmentsProps> = {

const dataColumns: ColumnType[] = [
   columnAccountName,
   columnEquity,
   columnShares,
   columnTotalReturn,
   columnPeriodReturn,
   columnInvested,
   columnGains,
   columnPL,
   columnPeriodPL,
   columnAnnualizedReturn,
   columnAverageCost,
   columnWeighedAverage,
];
const columns: Column<RowData, InvestmentsProps>[] =
   dataColumns.map(c => ({ ...c, cellTitle: c.tooltip }));

const Investments: React.FC<InvestmentsProps> = p => {
   const { prefs } = usePrefs();
   const { data } = useTickers(
      prefs.currencyId, 'all' /* accountIds */, p.range, p.hideIfNoShare);
   const doNothing = React.useCallback(() => {}, []);
   const [sorted, setSorted] = React.useState('');
   const sources = usePriceSources();

   const cols = React.useMemo(
      () => {
         const columnPriceSource: Column<RowData, InvestmentsProps> = {
            id: 'Source',
            cell: (r: RowData) => sources[r.ticker.source]?.name,
            compare: (r1: RowData, r2: RowData) =>
               (sources[r1.ticker.source].name ?? '')
                  .localeCompare(sources[r2.ticker.source].name ?? ''),
         }
         return [...columns, columnPriceSource];
      },
      [sources],
   );

   // We compute the date range once for all tickers, so that they all have
   // exactly the same range (otherwise resolving "now" might result in
   // different dates)
   const dateRange = toDates(p.range);

   const rows: LogicalRow<RowData, InvestmentsProps>[] = React.useMemo(
      () => data?.flatMap(ticker => ticker.accounts.map(acc => ({
         key: `${ticker.id}--${acc.account.id}`,
         data: computeTicker(ticker, acc, prefs, dateRange),
      }))) ?? [],
      [data, dateRange, prefs],
   );

   if (p.asTable) {
      return (
         <ListWithColumns
            className="investmentsTable"
            columns={cols}
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
               hideROIGraph: p.hideROIGraph,
               hidePriceGraph: p.hidePriceGraph,
            } as TickerPanelProps
            )
         )
      ).filter(a => a !== undefined);
      panels?.sort((a, b) =>
         a.acc!.account.name.localeCompare(b.acc!.account.name));

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
