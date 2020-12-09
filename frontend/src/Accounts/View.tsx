import * as React from 'react';
import AccountName from 'Account';
import useAccounts, { Account, AccountId } from 'services/useAccounts';
import accounts_to_rows from 'List/ListAccounts';
import { TreeMode } from 'services/useAccountTree';
import ListWithColumns, { Column, LogicalRow } from 'List/ListWithColumns';


/**
 * Properties for the view
 */
export interface AccountsProps {
}


/**
 * Row data
 */
interface RowData {
   accountId: AccountId;
   account: Account|undefined;
   fallback: string;  // fallback name when account is undefined
}

const columnName: Column<RowData, AccountsProps> = {
   id: 'Account',
   cell: (d: RowData) => d.account
      ? <AccountName id={d.accountId} account={d.account} />
      : d.fallback,
   compare: (d1, d2: RowData) =>
      (d1.account?.name ?? d1.fallback).localeCompare(
         d2.account?.name ?? d2.fallback),
}
const columnType: Column<RowData, AccountsProps> = {
   id: 'Type',
   cell: (d: RowData) => d.account?.kind.name,
   compare: (d1, d2: RowData) =>
      (d1.account?.kind.name || '').localeCompare(d2.account?.kind.name || ''),
}
const columnCommodity: Column<RowData, AccountsProps> = {
   id: 'Currency',
   cell: (d: RowData) => d.account?.commodity.name,
}
const columnReconciled: Column<RowData, AccountsProps> = {
   id: 'Reconcile',
   className: 'date',
   cell: (d: RowData) => d.account?.lastReconciled,
}
const columnIBAN: Column<RowData, AccountsProps> = {
   id: 'IBAN',
   cell: (d: RowData) => d.account?.iban,
}
const columnNumber: Column<RowData, AccountsProps> = {
   id: 'Number',
   cell: (d: RowData) => d.account?.number,
}
const columnClosed: Column<RowData, AccountsProps> = {
   id: 'Closed',
   className: 'closed',
   cell: (d: RowData) => d.account?.closed ? 'closed' : '',
}
const columnOpeningDate: Column<RowData, AccountsProps> = {
   id: 'Opened',
   className: 'date',
   cell: (d: RowData) => d.account?.opening_date,
}
const columnInstitution: Column<RowData, AccountsProps> = {
   id: 'Institution',
   cell: (d: RowData) => d.account?.getInstitution()?.name,
}


/**
 * Create a row, from an account. This might be used for virtual nodes, when
 * we need to organize things into a tree.
 */
const createRow = (a: Account|undefined, fallbackName: string): RowData => ({
   accountId: a?.id || -1,
   account: a,
   fallback: fallbackName,
});


const Accounts: React.FC<AccountsProps> = p => {
   const [sorted, setSorted] = React.useState('');

   const { accounts } = useAccounts();

   const columns: Column<RowData, AccountsProps>[] = React.useMemo(
      () => [
         columnName,
         columnType,
         columnCommodity,
         columnInstitution,
         columnIBAN,
         columnNumber,
         columnClosed,
         columnOpeningDate,
         columnReconciled
      ],
      []
   );

   const rows: LogicalRow<RowData, AccountsProps>[] = React.useMemo(
      () => accounts_to_rows(
         accounts,
         accounts.allAccounts(),
         createRow,
         TreeMode.USER_DEFINED),
      [accounts]
   );

   return (
      <ListWithColumns
         className="accounts"
         columns={columns}
         rows={rows}
         settings={p}
         defaultExpand={true}
         indentNested={true}
         sortOn={sorted}
         setSortOn={setSorted}
      />
   );
}
export default Accounts;
