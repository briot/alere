import * as React from 'react';
import { RelativeDate, dateToString } from 'Dates';
import Numeric from 'Numeric';
import AccountName from 'Account';
import { BalanceList } from 'services/useBalance';
import useBalanceWithThreshold, {
   BalanceWithAccount } from 'services/useBalanceWithThreshold';
import usePrefs from 'services/usePrefs';
import { Account } from 'services/useAccounts';
import useAccountTree, { TreeMode } from 'services/useAccountTree';
import useListFromAccount from 'List/ListAccounts';
import ListWithColumns, {
   AlternateRows, Column, LogicalRow, RowDetails } from 'List/ListWithColumns';
import "./NetWorth.css";

interface LocalTreeNode extends BalanceWithAccount {
   name?: string;
}

const columnAccountName: Column<LocalTreeNode> = {
   id: 'Account',
   cell: d => d.account
      ? <AccountName id={d.accountId} account={d.account} />
      : d.name || '',
   foot: () => "Total",
};

const columnShares = (base: BalanceList, date_idx: number) => ({
   id: `Shares${date_idx}`,
   head: 'Shares',
   className: 'price',
   cell: (d: LocalTreeNode, details: RowDetails<LocalTreeNode>) =>
      details.isExpanded === false
      ? ''
      : (
         <Numeric
            amount={d.atDate[date_idx]?.shares}
            commodity={d.account?.commodity}
         />
      ),
});

const columnPrice = (base: BalanceList, date_idx: number) => ({
   id: `Price${date_idx}`,
   head: 'Price',
   className: 'price',
   cell: (d: LocalTreeNode, details: RowDetails<LocalTreeNode>) =>
      details.isExpanded === false
      ? ''
      : (
         <Numeric
            amount={d.atDate[date_idx]?.price}
            commodity={base.currencyId}
         />
      )
});

const cumulatedValue = (
   logic: LogicalRow<LocalTreeNode>,
   date_idx: number,
   isExpanded: boolean | undefined,
): number => {
   const d = logic.data;
   const val = d.atDate[date_idx]?.price * d.atDate[date_idx]?.shares;
   return logic.getChildren === undefined || isExpanded === true
      ? val
      : logic.getChildren(d).reduce(
           (total, row) => total + cumulatedValue(row, date_idx, isExpanded),
           val || 0
      );
}

const columnValue = (base: BalanceList, date_idx: number) => ({
   id: `Value${date_idx}`,
   head: dateToString(base.dates[date_idx]),
   className: 'amount',
   cell: (d: LocalTreeNode, details: RowDetails<LocalTreeNode>) =>
      <Numeric
         amount={cumulatedValue(details.logic, date_idx, details.isExpanded)}
         commodity={base.currencyId}
      />,
   foot: () =>
      <Numeric
         amount={base.totalValue[date_idx]}
         commodity={base.currencyId}
      />
});

const columnPercent = (base: BalanceList, date_idx: number) => ({
   id: `Percent${date_idx}`,
   head: '% total',
   className: 'percent',
   cell: (d: LocalTreeNode, details: RowDetails<LocalTreeNode>) =>
      <Numeric
         amount={
            cumulatedValue(details.logic, date_idx, details.isExpanded)
            / base.totalValue[date_idx] * 100
         }
         suffix="%"
      />,
});

const columnDelta = (
   base: BalanceList, date_idx: number, ref: number,
   head: string, title: string,
) => {
   return {
      id: `${head}${date_idx}`,
      head,
      title,
      className: 'percent',
      cell: (d: LocalTreeNode, details: RowDetails<LocalTreeNode>) => {
         const m = cumulatedValue(details.logic, date_idx, details.isExpanded);
         const delta =
            Math.abs(m) < 1e-10
            ? NaN
            : (cumulatedValue(details.logic, ref, details.isExpanded) / m - 1
              ) * 100;
         return <Numeric amount={delta} suffix="%" />;
      },
      foot: () =>
         <Numeric
            amount={
               (base.totalValue[ref] / base.totalValue[date_idx] - 1) * 100
            }
            suffix="%"
         />
}};

export interface NetworthProps {
   dates: RelativeDate[];
   showValue: boolean;
   showPrice: boolean;
   showShares: boolean;
   showPercent: boolean;
   showDeltaNext: boolean;
   showDeltaLast: boolean;
   borders?: boolean;
   alternateColors?: boolean;
   treeMode: TreeMode;

   threshold: number;
   // Only show account if at least one of the value columns is above this
   // threshold (absolute value).
}

const Networth: React.FC<NetworthProps> = p => {
   const { prefs } = usePrefs();
   const {baseData, data} = useBalanceWithThreshold({
      ...p,
      currencyId: prefs.currencyId,
   });

   const createDummyParent = React.useCallback(
      (account: Account|undefined, name: string): LocalTreeNode => (
         { account,
           accountId: account?.id || -1,
           atDate: [],
           name,
         }),
      []
   );
   const tree = useAccountTree<LocalTreeNode>(
      data,
      createDummyParent,
      p.treeMode,
   );
   const rows = useListFromAccount(tree);

   const columns = React.useMemo(
      () => [
            undefined,  /* typescript workaround */
            columnAccountName,
         ].concat(p.dates.flatMap((_, date_idx) => [
            p.showShares ? columnShares(baseData, date_idx) : undefined,
            p.showPrice ? columnPrice(baseData, date_idx) : undefined,
            p.showValue ? columnValue(baseData, date_idx) : undefined,
            p.showPercent ? columnPercent(baseData, date_idx) : undefined,
            p.showDeltaNext && date_idx !== p.dates.length - 1
               ? columnDelta(
                  baseData, date_idx, date_idx + 1, 'ΔNext',
                  'Delta between this column and the next column')
               : undefined,
            p.showDeltaLast && date_idx !== p.dates.length - 1
               && (!p.showDeltaNext || date_idx !== p.dates.length - 2)
               ? columnDelta(
                  baseData, date_idx, p.dates.length - 1, 'ΔLast',
                  'Delta between this column and the last column')
               : undefined,
         ])),
      [p.dates, p.showShares, p.showPrice, p.showValue,
       baseData, p.showPercent, p.showDeltaLast, p.showDeltaNext]
   );

   return (
      <ListWithColumns
         className="networth"
         columns={columns}
         rows={rows}
         indentNested={true}
         defaultExpand={true}
         borders={p.borders}
         alternate={
            p.alternateColors
            ? AlternateRows.ROW : AlternateRows.NO_COLOR
         }
      />
   );
}

export default Networth;
