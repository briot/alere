import * as React from 'react';
import { toDates, DateRange } from '@/Dates';
import usePrefs from '@/services/usePrefs';
import { computeTicker } from '@/Ticker/Compute';
import { RowData } from '@/Ticker/types';
import AccountName from '@/Account/AccountName';
import ListWithColumns, { Column, LogicalRow } from '@/List/ListWithColumns';
import { ColumnType, columnEquity, columnTotalReturn, columnAnnualizedReturn,
   columnPL, columnWeighedAverage, columnPeriodPL, columnGains,
   columnAverageCost, columnPeriodReturn, columnLatest,
   columnShares, columnInvested,
   Aggregated, aggregate} from '@/Ticker/Data';
import useTickers from '@/services/useTickers';
import usePriceSources from '@/services/usePriceSources';

/**
 * Show all the user's investments
 */

export interface PerformanceProps {
   hideIfNoShare: boolean;
   range: DateRange;
}

interface ComputedPerformanceProps extends PerformanceProps, Aggregated {
}

type PerfColumnType = Column<RowData, ComputedPerformanceProps>;
type PerfRowType = LogicalRow<RowData, ComputedPerformanceProps>;

const columnAccountName: ColumnType = {
   id: 'Account',
   cell: (r: RowData) =>
      <AccountName id={r.acc.account.id} account={r.acc.account} fullName={false} />,
   compare: (r1: RowData, r2: RowData) =>
      r1.acc.account.name.localeCompare(r2.acc.account.name),
};

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
   columnLatest,
];

// ??? special handling for `foot` because it is not compatible typewise
const columns: PerfColumnType[] =
   dataColumns.map(c => ({
      ...c,
      foot: c.foot
         ? (settings: ComputedPerformanceProps) => c.foot?.(settings)
         : undefined,
   }));

const Performance: React.FC<PerformanceProps> = p => {
   const { prefs } = usePrefs();
   const data = useTickers(
      prefs.currencyId, 'all' /* accountIds */, p.range, p.hideIfNoShare);
   const [sorted, setSorted] = React.useState('');
   const sources = usePriceSources();

   const cols: PerfColumnType[] = React.useMemo(
      () => {
         const columnSource: Column<RowData, ComputedPerformanceProps> = {
            id: 'Source',
            cell: (r: RowData) => sources[r.ticker.source]?.name,
            compare: (r1: RowData, r2: RowData) =>
               (sources[r1.ticker.source].name ?? '')
                  .localeCompare(sources[r2.ticker.source].name ?? ''),
         }
         return [...columns, columnSource];
      },
      [sources],
   );

   // We compute the date range once for all tickers, so that they all have
   // exactly the same range (otherwise resolving "now" might result in
   // different dates)
   const dateRange = toDates(p.range);

   const rows: PerfRowType[] = React.useMemo(
      () => data?.flatMap(ticker => ticker.accounts.map(acc => ({
         key: `${ticker.id}--${acc.account.id}`,
         data: computeTicker(ticker, acc, prefs, dateRange),
      }))) ?? [],
      [data, dateRange, prefs],
   );

   const settings = React.useMemo(
      () => ({ ...p, ...aggregate(rows) }),
      [p, rows]
   );

   return (
      <ListWithColumns
         className="investmentsTable"
         columns={cols}
         rows={rows}
         settings={settings}
         defaultExpand={true}
         indentNested={true}
         sortOn={sorted}
         setSortOn={setSorted}
      />
   );
}
export default Performance;
