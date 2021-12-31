import * as React from 'react';
import AccountName from '@/Account';
import ListWithColumns, {
   Column, AlternateRows } from '@/List/ListWithColumns';
import { useFetchIEMulti } from '@/services/useFetchIE';
import { DateRange, rangeDisplay } from '@/Dates';
import { Account, AccountId, CommodityId } from '@/services/useAccounts';
import { numComp } from '@/services/utils';
import useBuildRowsFromAccounts from '@/List/ListAccounts';
import Numeric from '@/Numeric';
import { TreeMode } from '@/services/useAccountTree';


/**
 * Properties for the view
 */
export interface IEHistoryProps {
   ranges: DateRange[];
   roundValues?: boolean;
   treeMode?: TreeMode;
   borders?: boolean;
   alternateColors?: boolean;
}


/**
 * Row data
 */
interface RowData {
   account: Account | undefined;
   accountId: AccountId;
   values: number[];  // on per range in the request
   name: string;
   currency: CommodityId;
}

const columnCategory: Column<RowData, IEHistoryProps> = {
   id: 'Category',
   cell: (d: RowData) =>
      d.account
      ? <AccountName id={d.accountId} account={d.account} />
      : d.name,
   compare: (d1: RowData, d2: RowData) =>
      (d1.account?.name ?? d1.name).localeCompare(d2.account?.name ?? d2.name),
}
const columnValue = (
   index: number,
   range: DateRange,
): Column<RowData, IEHistoryProps> => {
   const d = rangeDisplay(range);
   return {
      id: d.text,
      title: d.as_dates,
      cell: (d: RowData, _, p: IEHistoryProps) =>
         <Numeric
            amount={d.values[index]}
            commodity={d.currency}
            scale={p.roundValues ? 0 : undefined}
         />,
      compare: (d1, d2) => numComp(d1.values[index], d2.values[index]),
   };
};

const IEHistory: React.FC<IEHistoryProps> = p => {
   const data = useFetchIEMulti(
      p.ranges.map(r => ({
         include_income: true,
         include_expenses: true,
         range: r,
      }))
   );
   const account_to_data = React.useMemo(
      () => {
         const perAccount: Record<AccountId, RowData> = {};
         data.forEach((d, idx) => {
            if (d) {
               d.items.forEach(it => {
                  let a = perAccount[it.accountId];
                  if (!a) {
                     a = perAccount[it.accountId] = {
                        account: it.account,
                        accountId: it.accountId,
                        values: new Array(p.ranges.length).fill(NaN),
                        name: it.name,
                        currency: d.currency,
                     };
                  }
                  a.values[idx] = it.value;
               });
            }
         });
         return perAccount;
      },
      [data, p.ranges]
   );

   const columns: Column<RowData, IEHistoryProps>[] = [
      columnCategory,
   ].concat(
      p.ranges.map((r, idx) => columnValue(idx, r))
   );

   const createNode = React.useCallback(
      (a: Account|undefined, fallbackName: string): RowData => {
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
         borders={p.borders}
         alternate={
            p.alternateColors
            ? AlternateRows.ROW : AlternateRows.NO_COLOR
         }
         indentNested={true}
         sortOn={sorted}
         setSortOn={setSorted}
      />
   );
}
export default IEHistory;
