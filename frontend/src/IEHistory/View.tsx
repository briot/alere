import * as React from 'react';
import AccountName from '@/Account';
import ListWithColumns, { Column } from '@/List/ListWithColumns';
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

const columnCategory: Column<IERanges, IEHistoryProps> = {
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
): Column<IERanges, IEHistoryProps> => {
   const d = rangeDisplay(range);
   return {
      id: d.text,
      title: d.as_dates,
      cell: (d: IERanges, _, p: IEHistoryProps) =>
         <Numeric
            amount={d.values[index]}
            commodity={d.currency}
            scale={p.roundValues ? 0 : undefined}
         />,
      compare: (d1, d2) => numComp(d1.values[index], d2.values[index]),
   };
};

const IEHistory: React.FC<IEHistoryProps> = p => {
   const account_to_data = useFetchIERanges(p.ranges);
   const columns: Column<IERanges, IEHistoryProps>[] = [
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

   const rows = useBuildRowsFromAccounts(
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
