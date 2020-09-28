import * as React from 'react';
import { RelativeDate, dateToString } from 'Dates';
import Numeric from 'Numeric';
import AccountName from 'Account';
import { SetHeader } from 'Header';
import { BalanceList } from 'services/useBalance';
import useBalanceWithThreshold, {
   BalanceWithAccount } from 'services/useBalanceWithThreshold';
import usePrefs from 'services/usePrefs';
import { Account } from 'services/useAccounts';
import useAccountTree, { TreeNode } from 'services/useAccountTree';
import useListFromAccount from 'List/ListAccounts';
import ListWithColumns, {
   AlternateRows, Column, LogicalRow, RowDetails } from 'List/ListWithColumns';
import "./NetWorth.css";

const columnAccountName: Column<BalanceWithAccount> = {
   id: 'Account',
   cell: d => <AccountName id={d.accountId} account={d.account} />,
   foot: () => "Total",
};

const columnShares = (base: BalanceList, date_idx: number) => ({
   id: `Shares${date_idx}`,
   head: 'Shares',
   cell: (d: BalanceWithAccount, details: RowDetails<BalanceWithAccount>) =>
      details.isExpanded === false
      ? ''
      : (
         <Numeric
            amount={d.atDate[date_idx]?.shares}
            precision={d.account?.sharesPrecision}
         />
      ),
});

const columnPrice = (base: BalanceList, date_idx: number) => ({
   id: `Price${date_idx}`,
   head: 'Price',
   cell: (d: BalanceWithAccount, details: RowDetails<BalanceWithAccount>) =>
      details.isExpanded === false
      ? ''
      : (
         <Numeric
            amount={d.atDate[date_idx]?.price}
            unit={base.currencyId}
         />
      )
});

const cumulatedValue = (
   logic: LogicalRow<BalanceWithAccount>,
   date_idx: number,
): number => {
   const d = logic.data;
   const val = d.atDate[date_idx]?.price * d.atDate[date_idx]?.shares || 0;
   return logic.getChildren === undefined
      ? val
      : logic.getChildren(d).reduce(
           (total, row) => total + cumulatedValue(row, date_idx),
           val
      );
}

const columnValue = (base: BalanceList, date_idx: number) => ({
   id: dateToString(base.dates[date_idx]),
   cell: (d: BalanceWithAccount, details: RowDetails<BalanceWithAccount>) =>
      <Numeric
         amount={
            details.isExpanded === false
            ? cumulatedValue(details.logic, date_idx)
            : d.atDate[date_idx]?.price * d.atDate[date_idx]?.shares
         }
         unit={base.currencyId}
      />,
   foot: () =>
      <Numeric
         amount={base.totalValue[date_idx]}
         unit={base.currencyId}
      />
});

export interface NetworthProps {
   dates: RelativeDate[];
   showValue: boolean;
   showPrice: boolean;
   showShares: boolean;
   alternateColors?: boolean;

   threshold: number;
   // Only show account if at least one of the value columns is above this
   // threshold (absolute value).
}

const Networth: React.FC<NetworthProps & SetHeader> = p => {
   const { prefs } = usePrefs();
   const {baseData, data} = useBalanceWithThreshold({
      ...p,
      currencyId: prefs.currencyId,
   });

   const createDummyParent = React.useCallback(
      (account: Account): BalanceWithAccount => (
         { account,
           accountId: account.id,
           atDate: [],
         }),
      []
   );
   const tree: TreeNode<BalanceWithAccount>[] = useAccountTree(
      data,
      createDummyParent);
   const rows = useListFromAccount(tree);

   const columns = React.useMemo(
      () => [
            undefined,  /* typescript workaround */
            columnAccountName,
         ].concat(p.dates.flatMap((_, date_idx) => [
            p.showShares ? columnShares(baseData, date_idx) : undefined,
            p.showPrice ? columnPrice(baseData, date_idx) : undefined,
            p.showValue ? columnValue(baseData, date_idx) : undefined,
         ])),
      [p.dates, p.showShares, p.showPrice, p.showValue, baseData]
   );

   const { setHeader } = p;
   React.useEffect(
      () => setHeader({ title: 'Net worth' }),
      [setHeader]
   );

   return (
      <ListWithColumns
         className="networth"
         columns={columns}
         rows={rows}
         indentNested={true}
         defaultExpand={true}
         alternate={
            p.alternateColors ? AlternateRows.ROW : AlternateRows.NO_COLOR
         }
      />
   );
}
export default Networth;
