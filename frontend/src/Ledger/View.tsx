import React from 'react';
import { Link } from 'react-router-dom';
import { DateRange, dateToString } from 'Dates';
import AccountName from 'Account';
import Table from 'List';
import { amountForAccounts, splitsForAccounts, amountIncomeExpense,
         incomeExpenseSplits, sharesForAccounts, priceForAccounts,
         Split, Transaction } from 'Transaction';
import Numeric from 'Numeric';
import ListWithColumns, {
   AlternateRows, Column, LogicalRow } from 'List/ListWithColumns';
import { Account, AccountId, CommodityId } from 'services/useAccounts';
import useAccountIds, {
   AccountIdSet, AccountList } from 'services/useAccountIds';
import './Ledger.css';

const SPLIT = '--split--';
const SPLIT_ID: AccountId = -1;
type MAIN_TYPE = "main";
const MAIN: MAIN_TYPE = 'main';

export enum SplitMode {
   HIDE,       // never show the splits
   SUMMARY,    // only one line for all splits (when more than two)
   COLLAPSED,  // one split per line, with a made up line on first line
}

export enum NotesMode {
   ONE_LINE,   // only use one line (notes are never displayed)
   AUTO,       // transactions use two lines if they have notes
   TWO_LINES,  // transactions always use two lines (to show notes)
   COLUMN,     // in a separate column
}

export interface BaseLedgerProps {
   accountIds: AccountIdSet;    // which subset of the accounts to show
   range?: DateRange|undefined; // undefined, to see forever
   notes_mode: NotesMode;
   split_mode: SplitMode;
   borders: boolean;
   defaultExpand: boolean;
   valueColumn: boolean;
   hideBalance?: boolean;
   hideReconcile?: boolean;
   alternateColors?: boolean;
   restrictExpandArrow?: boolean; // if true, only show arrow if more than 2 splits
   sortOn?: string;  // +colid  or -colid
}

export interface ComputedBaseLedgerProps extends BaseLedgerProps {
   transactions: Transaction[]; // use it instead of fetching
}

interface TableRowData {
   accounts: AccountList;
   transaction: Transaction;
   firstRowSplit: Split;         //  simulated split for the first row
   account: undefined|Account;   // destination account
   split: MAIN_TYPE | Split;  // what kind of row we are showing
}

const columnDate: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "date",
   head: "Date",
   className: "date",
   compare: (a, b) => a.transaction.date.localeCompare(b.transaction.date),
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? d.transaction.date
      : d.split.date,
}

const columnNum: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "num",
   className: "num",
   head: "Check #",
   compare: (a, b) =>
      (a.transaction.checknum ?? '').localeCompare(
         b.transaction.checknum ?? ''),
   cell: (d: TableRowData) => d.split === MAIN ? d.transaction.checknum : '',
}

const columnSummary: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Summary",
   className: "summary",
   cell: (d: TableRowData) => {
      const amount =
         d.account === undefined  //  not for one specific account
         ? amountIncomeExpense(d.transaction)
         : amountForAccounts(d.transaction, d.accounts.accounts);
      return (
         <>
            <Numeric
               amount={amount}
               commodity={d.firstRowSplit?.account?.commodity}
            />
            &nbsp;=&nbsp;
            {
               d.transaction.splits.map((s, index) =>
                  (d.accounts.accounts === undefined
                     || !s.account
                     || !d.accounts.accounts.includes(s.account)
                  ) ? (
                     <span key={index}>
                        <span>{ s.amount >= 0 ? ' - ' : ' + ' }</span>
                        <Numeric
                           amount={Math.abs(s.amount)}
                           commodity={s.account?.commodity}
                        />
                        &nbsp;(
                           <AccountName
                               id={s.accountId}
                               account={s.account}
                           />
                        )
                     </span>
                  ) : null
               )
            }
         </>
      );
   }
}

const columnMemo: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Memo",
   className: "memo",
   compare: (a, b) =>
      (a.transaction.memo ?? '').localeCompare(b.transaction.memo ?? ''),
   cell: (d: TableRowData) =>
      d.transaction.memo ? d.transaction.memo : 'No memo'
}

const columnPayee: Column<TableRowData, ComputedBaseLedgerProps> = {
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

const columnFromTo: Column<TableRowData, ComputedBaseLedgerProps> = {
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
             noLinkIf={d.accounts.accounts}
           />
      ) : (
        <AccountName
           id={d.split.accountId}
           account={d.split.account}
           noLinkIf={d.accounts.accounts}
        />
      )
}

const columnReconcile: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "R",
   className: "reconcile",
   cell: (d: TableRowData) =>
      d.split === MAIN ? d.firstRowSplit.reconcile : d.split.reconcile,
}

const columnAmount: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Amount",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   cell: (d: TableRowData) =>
      <Numeric
         amount={d.split === MAIN ? d.firstRowSplit.amount : d.split.amount}
         hideCommodity={true}
         commodity={
            d.split === MAIN
            ? d.firstRowSplit.account?.commodity
            : d.split.account?.commodity
         }
      />
}

const columnWidthdraw: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Payment",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? (d.firstRowSplit.amount < 0 &&
          <Numeric
             amount={Math.abs(d.firstRowSplit.amount)}
             commodity={d.firstRowSplit.account?.commodity}
             hideCommodity={true}
           />)
      : (d.split.amount < 0 &&
          <Numeric
             amount={Math.abs(d.split.amount)}
             commodity={d.split.account?.commodity}
             hideCommodity={true}
          />)
}

const columnDeposit: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Deposit",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? (d.firstRowSplit.amount >= 0 &&
         <Numeric
            amount={d.firstRowSplit.amount}
            commodity={d.firstRowSplit.account?.commodity}
            hideCommodity={true}
         />)
      : (d.split.amount >= 0 &&
         <Numeric
            amount={d.split.amount}
            commodity={d.split.account?.commodity}
            hideCommodity={true}
         />)
}

const columnShares: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Shares",
   className: "shares",
   compare: (a, b) =>
      (a.firstRowSplit.shares ?? 0) - (b.firstRowSplit.shares ?? 0),
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? (
         <Numeric
            amount={d.firstRowSplit.shares}
            commodity={d.account?.commodity}  //  the account's commodity
            hideCommodity={true}
            scale={Math.log10(d.account?.commodity_scu ?? 100)}
         />
      ) : d.account?.id === d.split.accountId ? (
         <Numeric
            amount={d.split.shares}
            commodity={d.account?.commodity}  //  the account's commodity
            hideCommodity={true}
            scale={Math.log10(d.account?.commodity_scu ?? 100)}
         />
      ) : undefined
}

const columnPrice: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Price",
   className: "amount",
   compare: (a, b) =>
      (a.firstRowSplit.price ?? 0) - (b.firstRowSplit.price ?? 0),
   title: "Price of one share at the time of the transaction",
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? (
         <Numeric
            amount={d.firstRowSplit.price}
            commodity={
               d.accounts.accounts.length > 1
               ? undefined
               : d.accounts.accounts[0]?.commodity
            }
            hideCommodity={true}
         />
      ) : d.account?.id === d.split.accountId ? (
         <Numeric
            amount={d.split.price}
            commodity={
               d.accounts.accounts.length > 1
               ? undefined
               : d.accounts.accounts[0]?.commodity
            }
            hideCommodity={true}
         />
      ) : undefined
}

const columnSharesBalance: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "SBalance",
   className: "shares",
   title: "Balance of shares",
   cell: (d: TableRowData) =>
      d.split === MAIN &&
      <Numeric
         amount={d.transaction?.balanceShares}
         commodity={d.account?.commodity}  //  the account's commodity
         hideCommodity={true}
      />
}

const columnBalance: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Balance",
   className: "amount",
   title: "Current worth at the time of the transaction. For stock accounts, this is the number of stocks times their price at the time (not the cumulated amount you have bought or sold for)",
   cell: (d: TableRowData) =>
      d.split === MAIN &&
      <Numeric
         amount={d.transaction.balance}
         commodity={d.firstRowSplit.account?.commodity}
      />
}

const columnTotal = (v: Totals): Column<TableRowData, ComputedBaseLedgerProps> => ({
   id: "Total",
   foot: () => (
      <>
         {
            v.selected &&
            <Table.TD>
               selected:
               <Numeric
                  amount={v.selected}
                  commodity={v.commodity}
                  hideCommodity={true}
               />
            </Table.TD>
         }
         {
            v.reconciled &&
            <Table.TD>
               reconciled:
               <Numeric
                  amount={v.reconciled}
                  commodity={v.commodity}
                  hideCommodity={true}
               />
            </Table.TD>
         }
         {
            v.cleared &&
            <Table.TD>
               cleared:
               <Numeric
                  amount={v.cleared}
                  commodity={v.commodity}
                  hideCommodity={true}
               />
            </Table.TD>
         }
         {
            v.present &&
            <Table.TD>
               present:
               <Numeric
                  amount={v.present}
                  commodity={v.commodity}
                  hideCommodity={true}
               />
            </Table.TD>
         }
         {
            v.future && v.future !== v.present &&
            <Table.TD>
               future:
               <Numeric
                  amount={v.future}
                  commodity={v.commodity}
                  hideCommodity={true}
               />
            </Table.TD>
         }
      </>
   )
})

/**
 * Compute totals
 */
interface Totals {
   commodity: CommodityId|undefined;
   future: number|undefined;
   present: number|undefined;
   reconciled: number;
   cleared: number;
   selected: number;
}
const nullTotal: Totals = {
   commodity: undefined,
   future: undefined, present: undefined, reconciled: 0,
   cleared: 0, selected: 0,
};

const useTotal = (
   transactions: Transaction[],
   accounts: Account[],
) => {
   const [total, setTotal] = React.useState(nullTotal);

   React.useEffect(
      () => setTotal(() => {
         const v = {...nullTotal};

         // If the accounts do not all have the same commodity, we cannot
         // compute the total.

         v.commodity = accounts[0]?.commodity.id;
         for (const a of accounts) {
            if (a.commodity.id !== v.commodity) {
               return v;
            }
         }

         v.future = transactions?.[transactions.length - 1]?.balanceShares;

         const formatted = dateToString("today");
         if (transactions) {
            const addSplit = (s: Split) => {
               switch (s.reconcile) {
                  case 'R': v.reconciled += s.shares ?? s.amount; break;
                  case 'C': v.cleared += s.shares ?? s.amount; break;
                  default: break;
               }
            }

            for (let j = transactions.length - 1; j >= 0; j--) {
               const t = transactions[j];
               if (v.present === undefined && t.date <= formatted) {
                  v.present = t.balanceShares;
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

const computeFirstSplit = (
   p: ComputedBaseLedgerProps,
   t: Transaction,
   accounts: AccountList,
) => {
   const sa = splitsForAccounts(t, accounts.accounts);
   let s: Split = {
      accountId: SPLIT_ID,

      // Set the account so that we display the currency in the first --split--
      // line.
      // ??? But then it is wrong for the Shares column or the Amount column,
      // since they do not use the same currency anyway.
      // ??? What if not all accounts use the same currency ? We have a wrong
      // total anyway below
      account: undefined, // p.accounts[0],

      reconcile: sa?.length ? sa[0].reconcile : 'n',
      date: sa?.[0]?.date ?? t.date,
      price:
         accounts.accounts.length > 1
         ? undefined
         : priceForAccounts(t, accounts.accounts) || undefined,
      shares:
         accounts.accounts.length > 1
         ? undefined
         : sharesForAccounts(t, accounts.accounts) || undefined,
      amount:
         accounts.accounts.length > 1
         ? amountIncomeExpense(t)
         : amountForAccounts(t, accounts.accounts),
   };

   switch (p.split_mode) {
      case SplitMode.HIDE:
      case SplitMode.COLLAPSED:
      case SplitMode.SUMMARY:
         if (t.splits.length < 3) {
            // Find the split for the account itself, to get balance
            const splits =
               accounts.accounts.length > 1
               ? incomeExpenseSplits(t)[0]
               : sa![0];
            const s2 = {...splits};

            // If we have a single account selected for the ledger, then we
            // display the target account in the first line.
            // But if we have multiple accounts, like "all income", we want to
            // show which one of them resulted in the transaction being
            // selected so we show that account.
            // ??? Perhaps should have a "from" and a "to" column, when we have
            // multiple accounts

            if (accounts.accounts.length === 1) {
               for (const s3 of t.splits) {
                  if (s3.account && !accounts.accounts.includes(s3.account)) {
                     s2.account = s3.account;
                     s2.accountId = s3.accountId;
                     break;
                  }
               }
            } else {
               for (const s3 of t.splits) {
                  if (s3.account && accounts.accounts.includes(s3.account)) {
                     s2.account = s3.account;
                     s2.accountId = s3.accountId;
                     break;
                  }
               }
            }

            s = {...s2, amount: s.amount, shares: s.shares, price: s.price};
         }
         break;
   }

   return s;
}


/**
 * Compute the children rows
 */

const getChildren = (d: TableRowData, settings: ComputedBaseLedgerProps) => {
   let result: LogicalRow<TableRowData, ComputedBaseLedgerProps, unknown>[] = [];
   const t = d.transaction;

   // Do we need a notes row ?

   let hasNotes: boolean;
   switch (settings.notes_mode) {
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

   if (!settings.restrictExpandArrow || t.splits.length > 2) {
      switch (settings.split_mode) {
         case SplitMode.SUMMARY:
            result.push({
               key: `${t.id}-sum`,
               columnsOverride: [ columnSummary, ],
               data: d,
            });
            break;

         case SplitMode.COLLAPSED:
            filterSplits = t.splits;
            break;

         default:  // SplitMode.HIDE
            break;
      }
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
const Ledger: React.FC<ComputedBaseLedgerProps & ExtraProps> = p => {
   const accounts = useAccountIds(p.accountIds);
   const total = useTotal(p.transactions, accounts.accounts);
   const singleAccount =
      (accounts.accounts.length === 1 ? accounts.accounts[0] : undefined);
   const isStock = singleAccount?.kind.is_stock;

   const columns = [
      columnDate,
      isStock                           ? undefined           : columnNum,
      isStock                           ? undefined           : columnPayee,
      p.notes_mode === NotesMode.COLUMN ? columnMemo : undefined,
                                          columnFromTo,
      p.hideReconcile                   ? undefined           : columnReconcile,
      p.valueColumn                     ? columnAmount        : undefined,
      p.valueColumn                     ? undefined           : columnWidthdraw,
      p.valueColumn                     ? undefined           : columnDeposit,
      isStock                           ? columnShares        : undefined,
      isStock                           ? columnPrice         : undefined,
      isStock && singleAccount          ? columnSharesBalance : undefined,
      p.hideBalance || !singleAccount   ? undefined           : columnBalance,
   ];

   const footColumns = singleAccount
      ? [
         columnTotal(total),
      ]
      : [];

   const rows: LogicalRow<TableRowData, ComputedBaseLedgerProps, unknown>[] = React.useMemo(
      () => p.transactions?.flatMap(t => [
            {
               data: {
                  accounts,
                  transaction: t,
                  firstRowSplit: computeFirstSplit(p, t, accounts),
                  split: MAIN,
                  account: singleAccount,
               },
               key: t.id,
               getChildren,
            }
         ]) ?? [],
      [singleAccount, p, accounts]
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
         settings={p}
         alternate={
            p.alternateColors ? AlternateRows.PARENT : AlternateRows.NO_COLOR
         }
      />
   );
}

export default React.memo(Ledger);
