import React from 'react';
import { Link } from 'react-router-dom';
import { DateRange, dateToString } from 'Dates';
import AccountName from 'Account';
import Table from 'List';
import { amountForAccounts, splitsForAccounts, amountIncomeExpense,
         incomeExpenseSplits, sharesForAccounts, priceForAccounts,
         splitsNotForAccounts, Split, Transaction } from 'Transaction';
import Numeric from 'Numeric';
import ListWithColumns, {
   AlternateRows, Column, LogicalRow } from 'List/ListWithColumns';
import { Account, AccountId, AccountIdList } from 'services/useAccounts';
import './Ledger.css';

const SPLIT = '--split--';
const SPLIT_ID: AccountId = -1;
type MAIN_TYPE = "main";
const MAIN: MAIN_TYPE = 'main';

export enum SplitMode {
   HIDE,       // never show the splits
   SUMMARY,    // only one line for all splits (when more than two)
   COLLAPSED,  // same as multiline, but do not show splits if there are only
               // two accounts involved
   OTHERS,     // same as multiline, but omit current account's splits
   MULTILINE,  // one line per split in a transaction
}

export enum NotesMode {
   ONE_LINE,   // only use one line (notes are never displayed)
   AUTO,       // transactions use two lines if they have notes
   TWO_LINES,  // transactions always use two lines (to show notes)
   COLUMN,     // in a separate column
}

export interface BaseLedgerProps {
   accountIds: AccountIdList;
   range?: DateRange|undefined   // undefined, to see forever
   notes_mode: NotesMode;
   split_mode: SplitMode;
   borders: boolean;
   defaultExpand: boolean;
   valueColumn: boolean;
   hideBalance?: boolean;
   hideReconcile?: boolean;
   alternateColors?: boolean;
   sortOn?: string;  // +colid  or -colid

   accounts: Account[] | undefined;         // computed from accountIds
   transactions: Transaction[] | undefined, // use it instead of fetching
}

interface TableRowData {
   settings: BaseLedgerProps;
   transaction: Transaction;
   firstRowSplit: Split;         //  simulated split for the first row
   account: undefined|Account;   // destination account
   split: MAIN_TYPE | Split;  // what kind of row we are showing
}

const columnDate: Column<TableRowData> = {
   id: "date",
   head: "Date",
   className: "date",
   compare: (a, b) => a.transaction.date.localeCompare(b.transaction.date),
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? d.transaction.date
      : d.split.date,
}

const columnNum: Column<TableRowData> = {
   id: "num",
   className: "num",
   head: "Check #",
   compare: (a, b) =>
      (a.transaction.checknum ?? '').localeCompare(
         b.transaction.checknum ?? ''),
   cell: (d: TableRowData) => d.split === MAIN ? d.transaction.checknum : '',
}

const columnSummary: Column<TableRowData> = {
   id: "Summary",
   className: "summary",
   cell: (d: TableRowData) => {
      const amount =
         d.account === undefined  //  not for one specific account
         ? amountIncomeExpense(d.transaction)
         : amountForAccounts(d.transaction, d.settings.accounts!);
      return (
         <>
            <Numeric amount={amount} />
            &nbsp;=&nbsp;
            {
               d.transaction.splits.map((s, index) =>
                  (d.settings.accounts === undefined
                     || !s.account
                     || !d.settings.accounts.includes(s.account)
                  ) ? <span key={index}>
                     <span>{ s.amount >= 0 ? ' - ' : ' + ' }</span>
                     <Numeric amount={Math.abs(s.amount)} />
                     &nbsp;(
                        <AccountName
                            id={s.accountId}
                            account={s.account}
                        />
                     )
                  </span> : null
               )
            }
         </>
      );
   }
}

const columnMemo: Column<TableRowData> = {
   id: "Memo",
   className: "memo",
   compare: (a, b) =>
      (a.transaction.memo ?? '').localeCompare(b.transaction.memo ?? ''),
   cell: (d: TableRowData) =>
      d.transaction.memo ? d.transaction.memo : 'No memo'
}

const columnPayee: Column<TableRowData> = {
   id: "Payee",
   className: "payee",
   compare: (a, b) =>
      (a.transaction.payee ?? '').localeCompare(b.transaction.payee ?? ''),
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? ( <Link to={`/payee/${d.transaction.payee}`}>
             {d.transaction.payee}
          </Link>
      ) : ''
}

const columnFromTo: Column<TableRowData> = {
   id: "From/To",
   className: "transfer",
   compare: (a, b) =>
      (a.firstRowSplit.account?.name ?? '').localeCompare(
         b.firstRowSplit.account?.name ?? ''),
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? (d.firstRowSplit.accountId === SPLIT_ID
         ? SPLIT
         : <AccountName
             id={d.firstRowSplit.accountId}
             account={d.firstRowSplit.account}
             noLinkIf={d.settings.accounts}
           />
      ) : (
        <AccountName
           id={d.split.accountId}
           account={d.split.account}
           noLinkIf={d.settings.accounts}
        />
      )
}

const columnReconcile: Column<TableRowData> = {
   id: "R",
   className: "reconcile",
   cell: (d: TableRowData) =>
      d.split === MAIN ? d.firstRowSplit.reconcile : d.split.reconcile,
}

const columnAmount: Column<TableRowData> = {
   id: "Amount",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   cell: (d: TableRowData) =>
      <Numeric
         amount={d.split === MAIN ? d.firstRowSplit.amount : d.split.amount}
      />
}

const columnWidthdraw: Column<TableRowData> = {
   id: "Payment",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? (d.firstRowSplit.amount < 0
           && <Numeric amount={Math.abs(d.firstRowSplit.amount)} />)
      : (d.split.amount < 0 && <Numeric amount={Math.abs(d.split.amount)} />)
}

const columnDeposit: Column<TableRowData> = {
   id: "Deposit",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? (d.firstRowSplit.amount >= 0
           && <Numeric amount={d.firstRowSplit.amount} />)
      : (d.split.amount >= 0 && <Numeric amount={d.split.amount} />)
}

const columnShares: Column<TableRowData> = {
   id: "Shares",
   className: "shares",
   compare: (a, b) =>
      (a.firstRowSplit.shares ?? 0) - (b.firstRowSplit.shares ?? 0),
   cell: (d: TableRowData) =>
      d.split === MAIN &&
      <Numeric
         amount={d.firstRowSplit.shares}
         scale={d.account?.sharesScale}
      />
}

const columnPrice: Column<TableRowData> = {
   id: "Price",
   className: "amount",
   compare: (a, b) =>
      (a.firstRowSplit.price ?? 0) - (b.firstRowSplit.price ?? 0),
   title: "Price of one share at the time of the transaction",
   cell: (d: TableRowData) =>
      d.split === MAIN &&
      <Numeric
         amount={d.firstRowSplit.price}
         scale={d.account?.priceScale}
      />
}

const columnSharesBalance: Column<TableRowData> = {
   id: "SBalance",
   className: "shares",
   title: "Balance of shares",
   cell: (d: TableRowData) =>
      d.split === MAIN &&
      <Numeric
          amount={d.transaction?.balanceShares}
          scale={d.account?.sharesScale}
      />
}

const columnBalance: Column<TableRowData> = {
   id: "Balance",
   className: "amount",
   cell: (d: TableRowData) =>
      d.split === MAIN &&
      <Numeric amount={d.transaction.balance} />
}

const columnTotal = (v: Totals): Column<TableRowData> => ({
   id: "Total",
   foot: () => (
      <>
         {
            v.selected &&
            <Table.TD>selected: <Numeric amount={v.selected} /></Table.TD>
         }
         {
            v.reconciled &&
            <Table.TD>reconciled: <Numeric amount={v.reconciled} /></Table.TD>
         }
         {
            v.cleared &&
            <Table.TD>cleared: <Numeric amount={v.cleared} /></Table.TD>
         }
         {
            v.present &&
            <Table.TD>present: <Numeric amount={v.present} /></Table.TD>
         }
         {
            v.future && v.future !== v.present &&
            <Table.TD>future: <Numeric amount={v.future} /></Table.TD>
         }
      </>
   )
})

/**
 * Compute totals
 */
interface Totals {
   future: number|undefined;
   present: number|undefined;
   reconciled: number;
   cleared: number;
   selected: number;
}
const nullTotal: Totals = {
   future: undefined, present: undefined, reconciled: 0,
   cleared: 0, selected: 0,
};

const useTotal = (
   transactions: Transaction[] | undefined,
   accounts: Account[] | undefined,
) => {
   const [total, setTotal] = React.useState(nullTotal);

   React.useEffect(
      () => setTotal(() => {
         const v = {...nullTotal};
         v.future = transactions?.[transactions.length - 1]?.balance;

         const formatted = dateToString("today");
         if (transactions) {
            const addSplit = (s: Split) => {
               switch (s.reconcile) {
                  case 'R': v.reconciled += s.amount; break;
                  case 'C': v.cleared += s.amount; break;
                  default: break;
               }
            }

            for (let j = transactions.length - 1; j >= 0; j--) {
               const t = transactions[j];
               if (v.present === undefined && t.date <= formatted) {
                  v.present = t.balance;
               }
               if (accounts === undefined) {
                  t.splits.forEach(addSplit);
               } else {
                  splitsForAccounts(t, accounts).forEach(addSplit);
               }
            }
         }
         return v;
      }),
      [transactions, accounts]
   );
   return total;
}

/**
 * Compute a dummy Split to be shown on the first line of a transaction
 */

const computeFirstSplit = (p: BaseLedgerProps, t: Transaction) => {
   const sa = p.accounts ? splitsForAccounts(t, p.accounts) : undefined;
   let s: Split = {
      accountId: SPLIT_ID,
      account: undefined,
      reconcile: sa?.length ? sa[0].reconcile : 'n',
      date: sa?.[0]?.date ?? t.date,
      price:
         (p.accounts === undefined || p.accounts.length > 1)
         ? undefined
         : priceForAccounts(t, p.accounts) || undefined,
      shares:
         (p.accounts === undefined || p.accounts.length > 1)
         ? undefined
         : sharesForAccounts(t, p.accounts) || undefined,
      amount:
         (p.accounts === undefined || p.accounts.length > 1)
         ? amountIncomeExpense(t)
         : amountForAccounts(t, p.accounts),
   };

   switch (p.split_mode) {
      case SplitMode.HIDE:
      case SplitMode.COLLAPSED:
      case SplitMode.SUMMARY:
         if (t.splits.length < 3) {
            // Find the split for the account itself, to get balance
            const splits =
               (p.accounts === undefined || p.accounts.length > 1)
               ? incomeExpenseSplits(t)[0]
               : sa![0];
            const s2 = {...splits};

            // Find the split not for the account, to get the target account
            for (const s3 of t.splits) {
               if (p.accounts === undefined) {
                  if (s3.account?.isIncomeExpense()) {
                     s2.accountId = s3.accountId;
                     s2.account = s3.account;
                     break;
                  }
               } else if (s3.account && !p.accounts.includes(s3.account)) {
                  s2.account = s3.account;
                  s2.accountId = s3.accountId;
                  break;
               }
            }

            s = {...s2, amount: s.amount, shares: s.shares, price: s.price};
         }
         break;
      case SplitMode.OTHERS:
         if (p.accounts !== undefined) {
            const d = splitsNotForAccounts(t, p.accounts)
            if (d.length === 1) {
               s = {...s,
                    account: d[0].account,
                    accountId: d[0].accountId};
            }
         }
         break;
      case SplitMode.MULTILINE:
         break;
   }

   return s;
}


/**
 * Compute the children rows
 */

const getChildren = (d: TableRowData) => {
   let result: LogicalRow<TableRowData>[] = [];
   const t = d.transaction;

   // Do we need a notes row ?

   let hasNotes: boolean;
   switch (d.settings.notes_mode) {
      case NotesMode.ONE_LINE:
      case NotesMode.COLUMN:
         hasNotes = false;
         break;
      case NotesMode.AUTO:
         hasNotes = t.memo ? true : false;
         break;
      default:
         hasNotes = true;
   }
   if (hasNotes) {
      result.push({
         key: `${t.id}-notes`,
         columnsOverride: [columnMemo],
         data: d,
      });
   }

   // What split rows do we need ?

   let filterSplits: undefined|Split[];

   switch (d.settings.split_mode) {
      case SplitMode.SUMMARY:
         if (t.splits.length > 2) {
            result.push({
               key: `${t.id}-sum`,
               columnsOverride: [ columnSummary, ],
               data: d,
            });
         }
         break;

      case SplitMode.COLLAPSED:
         if (t.splits.length > 2) {
            filterSplits = t.splits;
         }
         break;

      case SplitMode.OTHERS:
         filterSplits = d.settings.accounts === undefined
             ? t.splits
             : splitsNotForAccounts(t, d.settings.accounts);
         break;

      case SplitMode.MULTILINE:
         filterSplits = t.splits;
         break;

      default:  // SplitMode.HIDE
         break;
   }

   if (filterSplits) {
      result = result.concat(filterSplits.map((s, sid) => ({
         key: `${t.id}--${sid}`,
         data: {
            ...d,
            split: s,
         }
      })));
   }

   return result;
}

/**
 * A row to edit a new transaction
 */

//const EditingRow: React.FC<EditingRowProps> = p => {
//   return (
//      <div className="trgroup">
//         <Table.TR editable={true} >
//            <Table.TD kind='date'>
//               <input type="date" placeholder="2020-07-01" tabIndex={1} />
//            </Table.TD>
//            <Table.TD kind='num'>
//               <input placeholder="num" />
//            </Table.TD>
//            <Table.TD kind='payee'>
//               <input placeholder="payee" tabIndex={2} />
//            </Table.TD>
//            <Table.TD kind='transfer' />
//            <Table.TD kind='reconcile' />
//            <Table.TD kind='amount' />
//            <Table.TD kind='amount' />
//            <Table.TD kind='amount'>
//               <button className="fa fa-check" tabIndex={13} />
//            </Table.TD>
//         </Table.TR>
//         <Table.TR editable={true} >
//            <Table.TD kind='date' />
//            <Table.TD kind='num'>
//               <input placeholder="action" tabIndex={3} />
//            </Table.TD>
//            <Table.TD kind='payee'>
//               <input placeholder="notes" tabIndex={4} />
//            </Table.TD>
//            <Table.TD kind='transfer'>
//               <AccountName
//                  id={p.accountId}
//                  account={p.account}
//                  noLinkIf={[p.account]}
//               />
//            </Table.TD>
//            <Table.TD kind='reconcile'>
//               <select>
//                  <option>n</option>
//                  <option>C</option>
//                  <option>R</option>
//               </select>
//            </Table.TD>
//            <Table.TD kind='amount'>
//               <input
//                  type="numeric"
//                  placeholder="0.00"
//                  tabIndex={6}
//                  style={{textAlign: 'right'}}
//               />
//            </Table.TD>
//            <Table.TD kind='amount'>
//               <input
//                  type="numeric"
//                  placeholder="0.00"
//                  tabIndex={7}
//                  style={{textAlign: 'right'}}
//               />
//            </Table.TD>
//            <Table.TD kind='amount'>
//               <button className="fa fa-ban" />
//            </Table.TD>
//         </Table.TR>
//         <Table.TR editable={true} >
//            <Table.TD kind='date' />
//            <Table.TD kind='num'>
//               <input placeholder="action" tabIndex={8} />
//            </Table.TD>
//            <Table.TD kind='payee'>
//               <input placeholder="notes" tabIndex={9} />
//            </Table.TD>
//            <Table.TD kind='transfer'>
//               <input placeholder="transfer to/from" tabIndex={10} />
//            </Table.TD>
//            <Table.TD kind='reconcile' />
//            <Table.TD kind='amount'>
//               <input
//                  type="numeric"
//                  placeholder="0.00"
//                  tabIndex={11}
//                  style={{textAlign: 'right'}}
//               />
//            </Table.TD>
//            <Table.TD kind='amount'>
//               <input
//                  type="numeric"
//                  placeholder="0.00"
//                  tabIndex={12}
//                  style={{textAlign: 'right'}}
//               />
//            </Table.TD>
//            <Table.TD kind='amount' />
//            </Table.TR>
//      </div>
//   );
//}

/**
 * The full ledger, for a panel
 */

interface ExtraProps {
   setSortOn?: (on: string) => void; //  called when user wants to sort
}
const Ledger: React.FC<BaseLedgerProps & ExtraProps> = p => {
   const total = useTotal(p.transactions, p.accounts);
   const singleAccount =
      (p.accounts !== undefined && p.accounts.length === 1
       ? p.accounts[0]
       : undefined);
   const isStock = singleAccount?.isStock();

   const columns = [
      columnDate,
      columnNum,
      columnPayee,
      p.notes_mode === NotesMode.COLUMN ? columnMemo : undefined,
      columnFromTo,
      p.hideReconcile ? undefined           : columnReconcile,
      p.valueColumn   ? columnAmount        : undefined,
      p.valueColumn   ? undefined           : columnWidthdraw,
      p.valueColumn   ? undefined           : columnDeposit,
      isStock         ? columnShares        : undefined,
      isStock         ? columnPrice         : undefined,
      isStock         ? columnSharesBalance : undefined,
      p.hideBalance   ? undefined           : columnBalance,
   ];

   const footColumns = p.accountIds.length !== 1
      ? []
      : [
         columnTotal(total),
      ];

   const rows: LogicalRow<TableRowData>[] = React.useMemo(
      () => p.transactions?.flatMap(t => [
            {
               data: {
                  settings: p,
                  transaction: t,
                  firstRowSplit: computeFirstSplit(p, t),
                  split: MAIN,
                  account: singleAccount,
               },
               key: t.id,
               getChildren,
            }
         ]) ?? [],
      [singleAccount, p]
   );

   return (
      <ListWithColumns
         className="ledgerTable"
         columns={columns}
         rows={rows}
         borders={p.borders}
         defaultExpand={p.defaultExpand}
         footColumnsOverride={footColumns}
         scrollToBottom={true}
         sortOn={p.sortOn}
         setSortOn={p.setSortOn}
         alternate={
            p.alternateColors ? AlternateRows.PARENT : AlternateRows.NO_COLOR
         }
      />
   );
}

export default React.memo(Ledger);
