import * as React from 'react';
import AccountName from '@/Account/AccountName';
import ListWithColumns, {
   Column, LogicalRow, RowDetails } from '@/List/ListWithColumns';
import { IERanges, useFetchIERanges } from '@/services/useFetchIE';
import { TablePrefs } from '@/List/ListPrefs';
import { DateRange, rangeDisplay } from '@/Dates';
import { Account } from '@/services/useAccounts';
import { numComp } from '@/services/utils';
import useBuildRowsFromAccounts from '@/List/ListAccounts';
import Numeric from '@/Numeric';
import { TreeMode } from '@/services/TreeMode';

/**
 * Properties for the view
 */
export interface IEHistoryProps {
   ranges: DateRange[];
   roundValues?: boolean;
   treeMode?: TreeMode;
   tablePrefs: TablePrefs;
}

type RowType = LogicalRow<IERanges, IEHistoryProps>;
type DetailsType = RowDetails<IERanges, IEHistoryProps>;
type ColumnType = Column<IERanges, IEHistoryProps>;


const cumulatedValue = (
   row: RowType,
   settings: IEHistoryProps,
   index: number,
   isExpanded: boolean | undefined,
): number => {
   const val = row.data.values[index] ?? 0;
   const v = isNaN(val) ? 0 : val;
   return (isExpanded || row.getChildren === undefined)
      ? v
      : row.getChildren(row.data, settings).reduce(
         (total, child) =>
            total + cumulatedValue(child, settings, index, false),
         v
      );
};

const columnCategory: ColumnType = {
   id: 'Category',
   cell: (d: IERanges) =>
      d.account
      ? <AccountName id={d.accountId} account={d.account} />
      : d.name,
   compare: (d1: IERanges, d2: IERanges) =>
      (d1.account?.name ?? d1.name).localeCompare(d2.account?.name ?? d2.name),
}
const columnValue = (
   index: number,
   range: DateRange,
): ColumnType => {
   const d = rangeDisplay(range);
   return {
      id: d.text,
      title: d.as_dates,
      cell: (d: IERanges, row: DetailsType, p: IEHistoryProps) =>
         <Numeric
            amount={cumulatedValue(row.logic, p, index, row.isExpanded) || NaN}
            commodity={d.currency}
            scale={p.roundValues ? 0 : undefined}
         />,
      compare: (d1, d2) => numComp(d1.values[index], d2.values[index]),
   };
};

const IEHistory: React.FC<IEHistoryProps> = p => {
   const account_to_data = useFetchIERanges(p.ranges);
   const columns: ColumnType[] = [
         columnCategory,
      ].concat(
         p.ranges.map((r, idx) => columnValue(idx, r))
   );
   const createNode = React.useCallback(
      (a: Account|undefined, fallbackName: string): IERanges => {
         const id = a?.id ?? -1;
         let acc = account_to_data[id];
         if (!acc) {
            acc = account_to_data[id] = {
               account: a,
               accountId: id,
               values: [],
               name: a?.name ?? fallbackName,
               currency: -1,
            };
         }
         return acc;
      },
      [account_to_data]
   );

   const rows = useBuildRowsFromAccounts<IERanges, IEHistoryProps>(
      createNode,
      a => account_to_data.hasOwnProperty(a.id),  // filter
      p.treeMode,
   );

   const [sorted, setSorted] = React.useState('');
   return (
      <ListWithColumns
         className="iehistory"
         columns={columns}
         rows={rows}
         settings={p}
         defaultExpand={true}
         indentNested={true}
         sortOn={sorted}
         setSortOn={setSorted}
         {...p.tablePrefs}
      />
   );
}
export default IEHistory;
