import * as React from 'react';
import { RelativeDate, dateToString } from '@/Dates';
import Numeric from '@/Numeric';
import AccountName from '@/Account/AccountName';
import { BalanceList } from '@/services/useBalance';
import usePrefs from '@/services/usePrefs';
import { Account, AccountId } from '@/services/useAccounts';
import { TreeMode } from '@/services/TreeMode';
import useBuildRowsFromAccounts from '@/List/ListAccounts';
import useBalance, { Balance } from '@/services/useBalance';
import ListWithColumns, {
   Column, LogicalRow, RowDetails } from '@/List/ListWithColumns';
import { TablePrefs } from '@/List/ListPrefs';
import "./NetWorth.scss";

export interface NetworthProps {
   dates: RelativeDate[];
   showValue: boolean;
   showPrice: boolean;
   showShares: boolean;
   showPercent: boolean;
   showDeltaNext: boolean;
   showDeltaLast: boolean;
   roundValues?: boolean;  // whether to show cents or not
   treeMode: TreeMode;

   tablePrefs: TablePrefs;

   expandTradingAccounts?: boolean;
   // If true, investment accounts are expanded by default to show their
   // stocks.

   threshold: number;
   // Only show account if at least one of the value columns is above this
   // threshold (absolute value).
}
interface LocalTreeNode {
   accountId: AccountId;
   account: Account|undefined;
   name?: string;
   balance: Balance|undefined;
}

type ColumnType = Column<LocalTreeNode, NetworthProps>;
type Row = LogicalRow<LocalTreeNode, NetworthProps>;
type RowWithDetails = RowDetails<LocalTreeNode, NetworthProps>;

const columnAccountName: ColumnType = {
   id: 'Account',
   cell: d => d.account
      ? <AccountName id={d.accountId} account={d.account} />
      : d.name || '',
   foot: () => "Total",
};

const columnShares = (date_idx: number): ColumnType => ({
   id: `Shares${date_idx}`,
   head: 'Shares',
   className: 'shares',
   cell: (d: LocalTreeNode,
          details: RowWithDetails,
          settings: NetworthProps) =>
      details.isExpanded === false || !d.balance || !d.account?.kind.is_stock
      ? '-'
      : (
         <Numeric
            amount={d.balance.atDate[date_idx]?.shares}
            commodity={d.account?.commodity}
            hideCommodity={true}
         />
      ),
});

const columnPrice = (
   base: BalanceList, date_idx: number,
): ColumnType => ({
   id: `Price${date_idx}`,
   head: 'Price',
   className: 'price',
   cell: (d: LocalTreeNode,
          details: RowWithDetails,
          settings: NetworthProps ) =>
      details.isExpanded === false || !d.balance || !d.account?.kind.is_stock
      ? '-'
      : (
         <Numeric
            amount={d.balance.atDate[date_idx]?.price}
            commodity={base.currencyId}
         />
      )
});

const cumulatedValue = (
   logic: Row,
   settings: NetworthProps,
   date_idx: number,
   isExpanded: boolean | undefined,
): number => {
   const d = logic.data;

   const val = d.balance === undefined
      ? NaN
      : d.balance.atDate[date_idx]?.price
         * d.balance.atDate[date_idx]?.shares;
   return logic.getChildren === undefined || isExpanded === true
      ? val
      : logic.getChildren(d, settings).reduce(
           (total, row) =>
              total + cumulatedValue(
                 row, settings, date_idx, isExpanded),
           isNaN(val) ? 0 : val,
      );
}

const columnValue = (
   base: BalanceList, date_idx: number,
): ColumnType => ({
   id: `Value${date_idx}`,
   head: dateToString(base.dates[date_idx]),
   className: 'amount',
   cell: (d: LocalTreeNode,
          details: RowWithDetails,
          settings: NetworthProps) =>
      <Numeric
         amount={cumulatedValue(
            details.logic, settings, date_idx, details.isExpanded)}
         commodity={base.currencyId}
         scale={settings.roundValues ? 0 : undefined}
      />,
   foot: (settings: NetworthProps) =>
      <Numeric
         amount={base.totalValue[date_idx]}
         commodity={base.currencyId}
         scale={settings.roundValues ? 0 : undefined}
      />
});

const columnPercent = (
   base: BalanceList, date_idx: number,
): ColumnType => ({
   id: `Percent${date_idx}`,
   head: '% total',
   className: 'percent',
   cell: (d: LocalTreeNode,
          details: RowWithDetails,
          settings: NetworthProps) =>
      <Numeric
         amount={
            cumulatedValue(
               details.logic, settings, date_idx, details.isExpanded)
            / base.totalValue[date_idx] * 100
         }
         suffix="%"
      />,
});

const columnDelta = (
   base: BalanceList, date_idx: number, ref: number,
   head: string, title: string,
): ColumnType => {
   return {
      id: `${head}${date_idx}`,
      head,
      title,
      className: 'percent',
      cell: (d: LocalTreeNode,
             details: RowWithDetails,
             settings: NetworthProps) => {
         const m = cumulatedValue(
            details.logic, settings, date_idx, details.isExpanded);
         const delta =
            Math.abs(m) < 1e-10
            ? NaN
            : (cumulatedValue(
                  details.logic, settings,
                  ref, details.isExpanded) / m - 1
              ) * 100;
         return <Numeric amount={delta} suffix="%" />;
      },
      foot: (settings: NetworthProps) =>
         <Numeric
            amount={
               (base.totalValue[ref] / base.totalValue[date_idx] - 1) * 100
            }
            suffix="%"
         />
}};

const Networth: React.FC<NetworthProps> = p => {
   const { prefs } = usePrefs();
   const balances = useBalance({...p, currencyId: prefs.currencyId});
   const thresh = p.threshold ?? 1e-10;
   const accountToBalance = React.useMemo(
      () => {
         const r: Map<AccountId, Balance> = new Map();
         balances?.list
            // Remove lines below the threshold
            .filter(n =>
               n.atDate.find(a =>
                  (Math.abs(a.shares * a.price) >= thresh)) !== undefined)
            .forEach(n => r.set(n.accountId, n));
         return r;
      },
      [balances, thresh]
   );

   const createRow = React.useCallback(
      (account: Account|undefined, name: string): LocalTreeNode => ({
         account,
         accountId: account?.id || -1,
         name,
         balance: account ? accountToBalance.get(account.id) : undefined,
         }),
      [accountToBalance]
   );

   const rows = useBuildRowsFromAccounts<LocalTreeNode, NetworthProps>(
      createRow,
      a => accountToBalance.has(a.id),  // filter
      p.treeMode);

   const colsForDate = React.useCallback(
      (date_idx: number) => {
         const r = [
            p.showShares ? columnShares(date_idx) : undefined,
            p.showPrice ? columnPrice(balances, date_idx) : undefined,
            p.showValue ? columnValue(balances, date_idx) : undefined,
            p.showPercent ? columnPercent(balances, date_idx) : undefined,
            p.showDeltaNext && date_idx !== p.dates.length - 1
               ? columnDelta(
                  balances, date_idx, date_idx + 1, 'ΔNext',
                  'Delta between this column and the next column')
               : undefined,
            p.showDeltaLast && date_idx !== p.dates.length - 1
               && (!p.showDeltaNext || date_idx !== p.dates.length - 2)
               ? columnDelta(
                  balances, date_idx, p.dates.length - 1, 'ΔLast',
                  'Delta between this column and the last column')
               : undefined,
         ].filter(d => d !== undefined) as ColumnType[];

         if (r.length) {
            r[r.length - 1].rightBorder = true;
         }

         return r;
      },
      [p.showShares, p.showPrice, p.showValue, p.dates.length,
       balances, p.showPercent, p.showDeltaLast, p.showDeltaNext]
   );

   const columns: (undefined | Column<LocalTreeNode, NetworthProps>)[] = React.useMemo(
      () => [
            undefined,  /* typescript workaround */
            columnAccountName,
         ].concat(p.dates.flatMap((_, date_idx) => colsForDate(date_idx))),
      [p.dates, colsForDate]
   );

   const defaultExpand = React.useCallback(
      (r: Row) => p.expandTradingAccounts || !r.data.account?.kind.is_trading,
      [p.expandTradingAccounts]
   );

   return (
      <ListWithColumns
         className="networth"
         columns={columns}
         rows={rows}
         indentNested={true}
         defaultExpand={defaultExpand}
         settings={p}
         {...p.tablePrefs}
      />
   );
}

export default Networth;
