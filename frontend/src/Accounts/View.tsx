import * as React from 'react';
import AccountName from '@/Account';
import { Account, AccountId } from '@/services/useAccounts';
import useBuildRowsFromAccounts from '@/List/ListAccounts';
import ListWithColumns, { Column } from '@/List/ListWithColumns';
import RoundButton from '@/RoundButton';


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

const columnActions: Column<RowData, AccountsProps> = {
   id: 'Actions',
   className: 'accountsActions',
   head: '',
   cell: (d: RowData) => (
      <span>
         <RoundButton
            fa="fa-book"
            size='tiny'
            flat={true}
            tooltip='Show ledger'
            url={`/ledger?accounts=${d.account?.id}`}
         />
         <RoundButton
            fa="fa-pencil"
            size='tiny'
            flat={true}
            tooltip='Edit account'
            url={`/accountEdit?accounts=${d.account?.id}`}
         />
      </span>
   ),
}
const columnName: Column<RowData, AccountsProps> = {
   id: 'Account',
   cell: (d: RowData) =>
      d.account
      ? <AccountName id={d.accountId} account={d.account} />
      : d.fallback,
   compare: (d1: RowData, d2: RowData) =>
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
   cell: (d: RowData) => d.account?.account_num,
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
   cell: (d: RowData) => d.account?.getInstitution()?.name
}


/**
 * Create a row, from an account. This might be used for virtual nodes, when
 * we need to organize things into a tree.
 */
const createRow = (a: Account|undefined, fallbackName: string): RowData => ({
   accountId: a?.id || -1,
   account: a,
   fallback: a?.name ?? fallbackName,
});

const columns: Column<RowData, AccountsProps>[] = [
   columnActions,
   columnName,
   columnType,
   columnCommodity,
   columnInstitution,
   columnIBAN,
   columnNumber,
   columnClosed,
   columnOpeningDate,
   columnReconciled,
];

const Accounts: React.FC<AccountsProps> = p => {
   const [sorted, setSorted] = React.useState('');
   const rows = useBuildRowsFromAccounts(createRow);
   return (
      <ListWithColumns
         className="accounts"
         columns={columns}
         rows={rows}
         settings={p}
         defaultExpand={true}
         expanderColumn={1}
         indentNested={true}
         sortOn={sorted}
         setSortOn={setSorted}
      />
   );
}
export default Accounts;
