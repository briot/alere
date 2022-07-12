import React from 'react';
import { Link } from 'react-router-dom';
import { DateRange } from '@/Dates';
import AccountName from '@/Account/AccountName';
import Table from '@/List';
import { amountForAccounts, splitsForAccounts, amountIncomeExpense,
         incomeExpenseSplits, sharesForAccounts, priceForAccounts,
         Split, Transaction, reconcileToString } from '@/Transaction';
import Numeric from '@/Numeric';
import ListWithColumns, { Column, LogicalRow } from '@/List/ListWithColumns';
import { Account, AccountId, is_liquid } from '@/services/useAccounts';
import { TablePrefs } from '@/List/ListPrefs';
import useAccountIds, {
   AccountIdSet, AccountSet } from '@/services/useAccountIds';
import { Preferences } from '@/services/usePrefs';
import useTransactions from '@/services/useTransactions';
import usePrefs from '@/services/usePrefs';

import './Ledger.scss';

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

export interface BaseLedgerProps extends TablePrefs {
   accountIds: AccountIdSet;    // which subset of the accounts to show
   range?: DateRange|undefined; // use undefined to see forever
   date?: Date;                 // a reference date (by default: today)
   notes_mode: NotesMode;
   split_mode: SplitMode;
   defaultExpand: boolean;
   valueColumn: boolean;
   hideBalance?: boolean;
   hideReconcile?: boolean;
   restrictExpandArrow?: boolean; // if true, only show arrow if more than 2 splits
   sortOn?: string;  // +colid  or -colid
   includeScheduled?: boolean;
}

interface Totals {
   future: number|undefined;  // future value, looking at all transactions
   present: number|undefined; // current value, ignoring transactions in future
   reconciled: number;        // only look at reconciled transactions
   cleared: number;           // only look at reconciled and cleared transactions
   selected: number;          // total of selected transactions
}
const nullTotal: Totals = {
//   commodity: undefined,
   future: undefined, present: undefined, reconciled: 0,
   cleared: 0, selected: 0,
};

export interface ComputedBaseLedgerProps extends BaseLedgerProps {
   transactions: Transaction[]; // use it instead of fetching
   prefs : Preferences;
   singleAccount: Account | undefined; // if a single account was selected
   accounts: AccountSet;
   total: Totals;
}

interface TableRowData {
   accounts: AccountSet;
   transaction: Transaction;
   firstRowSplit: Split;         //  simulated split for the first row
   account: undefined|Account;   // destination account
   split: MAIN_TYPE | Split;  // what kind of row we are showing
}

const hideCommodity = (
   s: Split|undefined, settings: ComputedBaseLedgerProps
) =>
   s?.currency === settings.prefs.currencyId;

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
   cell: (d: TableRowData, _: any, settings) => {
      const amount =
         d.account === undefined  //  not for one specific account
         ? amountIncomeExpense(d.transaction)
         : amountForAccounts(d.transaction, d.accounts.accounts);
      return (
         <>
            <Numeric
               amount={amount}
               commodity={d.firstRowSplit?.currency}
               hideCommodity={hideCommodity(d.firstRowSplit, settings)}
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
                           commodity={s.currency}
                           hideCommodity={hideCommodity(s, settings)}
                        />
                        &nbsp;(
                           <AccountName
                               id={s.account_id}
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
      d.split === MAIN
      ? (d.transaction.memo ? d.transaction.memo : '')
      : '',
}

const PayeeLink: React.FC<{payee: string|undefined}> = p =>
   p.payee === undefined
   ? null
   : <Link to={`/payee/${p.payee}`}>{p.payee}</Link>;

const columnPayee: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Payee",
   className: "payee",
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? <PayeeLink payee={d.firstRowSplit.payee} />
      : <PayeeLink payee={d.split.payee} />
}

const columnFromTo: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "From/To",
   className: "transfer",
   compare: (a, b) =>
      (a.firstRowSplit.account?.name ?? '').localeCompare(
         b.firstRowSplit.account?.name ?? ''),
   cell: (d: TableRowData) =>
      d.split === MAIN
      ? (d.firstRowSplit.account_id === SPLIT_ID
         ? (d.transaction.memo || SPLIT)
         : <AccountName
             id={d.firstRowSplit.account_id}
             account={d.firstRowSplit.account}
             noLinkIf={d.accounts.accounts}
           />
      ) : (
        <AccountName
           id={d.split.account_id}
           account={d.split.account}
           noLinkIf={d.accounts.accounts}
        />
      )
}

const columnReconcile: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "R",
   className: "reconcile",
   cell: (d: TableRowData) =>
      reconcileToString(
         d.split === MAIN ? d.firstRowSplit.reconcile : d.split.reconcile),
}

const columnAmount: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Amount",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   cell: (d: TableRowData, _: any, settings) =>
      <Numeric
         amount={d.split === MAIN ? d.firstRowSplit.amount : d.split.amount}
         hideCommodity={
            hideCommodity(
               d.split === MAIN  ? d.firstRowSplit : d.split,
               settings
            )
         }
         commodity={
            d.split === MAIN
            ? d.firstRowSplit.currency
            : d.split.currency
         }
      />
}

const columnWidthdraw: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Payment",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   head: s => s.singleAccount?.kind.negative ?? 'Payment',
   cell: (d: TableRowData, _, settings) =>
      d.split === MAIN
      ? (d.firstRowSplit.amount < 0 &&
          <Numeric
             amount={Math.abs(d.firstRowSplit.amount)}
             commodity={d.firstRowSplit.currency}
             hideCommodity={hideCommodity(d.firstRowSplit, settings)}
           />)
      : (d.split.amount < 0 &&
          <Numeric
             amount={Math.abs(d.split.amount)}
             commodity={d.split.currency}
             hideCommodity={hideCommodity(d.split, settings)}
          />)
}

const columnDeposit: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Deposit",
   className: "amount",
   compare: (a, b) => a.firstRowSplit.amount - b.firstRowSplit.amount,
   head: s => s.singleAccount?.kind.positive ?? 'Deposit',
   cell: (d: TableRowData, _, settings) =>
      d.split === MAIN
      ? (d.firstRowSplit.amount >= 0 &&
         <Numeric
            amount={d.firstRowSplit.amount}
            commodity={d.firstRowSplit.currency}
            hideCommodity={hideCommodity(d.firstRowSplit, settings)}
         />)
      : (d.split.amount >= 0 &&
         <Numeric
            amount={d.split.amount}
            commodity={d.split.currency}
            hideCommodity={hideCommodity(d.split, settings)}
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
            commodity={d.firstRowSplit.currency}
            hideCommodity={true}
            scale={Math.log10(d.account?.commodity_scu ?? 100)}
         />
      ) : d.account?.id === d.split.account_id ? (
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
   className: "price",
   compare: (a, b) =>
      (a.firstRowSplit.price ?? 0) - (b.firstRowSplit.price ?? 0),
   title: "Price of one share at the time of the transaction",
   cell: (d: TableRowData, _: any, settings: ComputedBaseLedgerProps) =>
      d.split === MAIN
      ? (
         <Numeric
            amount={d.firstRowSplit.price}
            commodity={d.firstRowSplit.currency}
            hideCommodity={hideCommodity(d.firstRowSplit, settings)}
         />
      ) : d.account?.id === d.split.account_id ? (
         <Numeric
            amount={d.split.price}
            commodity={d.split.currency}
            hideCommodity={hideCommodity(d.split, settings)}
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
         scale={Math.log10(d.account?.commodity_scu ?? 100)}
      />
}

const columnBalance: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Balance",
   className: "amount",
   title: "Current worth at the time of the transaction. For stock accounts, this is the number of stocks times their price at the time (not the cumulated amount you have bought or sold for)",
   cell: (d: TableRowData, _, settings) =>
      d.split === MAIN &&
      <Numeric
         amount={d.transaction.balance}
         commodity={d.firstRowSplit.currency}
         hideCommodity={hideCommodity(d.firstRowSplit, settings)}
      />
}

const columnTotal: Column<TableRowData, ComputedBaseLedgerProps> = {
   id: "Total",
   foot: (v: ComputedBaseLedgerProps) => (
      <>
         {
            v.total.selected
            ? (
               <Table.TD>
                  selected:
                  <Numeric
                     amount={v.total.selected}
                     commodity={v.singleAccount?.commodity.id}
                     hideCommodity={true}
                  />
               </Table.TD>
            ) : null
         }
         {
            v.total.reconciled
            ? (
               <Table.TD>
                  reconciled:
                  <Numeric
                     amount={v.total.reconciled}
                     commodity={v.singleAccount?.commodity.id}
                     hideCommodity={true}
                  />
               </Table.TD>
            ) : null
         }
         {
            v.total.cleared
            ? (
               <Table.TD>
                  cleared:
                  <Numeric
                     amount={v.total.cleared}
                     commodity={v.singleAccount?.commodity.id}
                     hideCommodity={true}
                  />
               </Table.TD>
            ) : null
         }
         {
            v.total.present
            ? (
               <Table.TD>
                  present:
                  <Numeric
                     amount={v.total.present}
                     commodity={v.singleAccount?.commodity.id}
                     hideCommodity={true}
                  />
               </Table.TD>
            ) : null
         }
         {
            v.total.future && v.total.future !== v.total.present
            ? (
               <Table.TD>
                  future:
                  <Numeric
                     amount={v.total.future}
                     commodity={v.singleAccount?.commodity.id}
                     hideCommodity={true}
                  />
               </Table.TD>
            ) : null
         }
      </>
   )
}

/**
 * Compute a dummy Split to be shown on the first line of a transaction
 */

const computeFirstSplit = (
   p: BaseLedgerProps,
   t: Transaction,
   accounts: AccountSet,
) => {
   const sa = splitsForAccounts(t, accounts.accounts);
   let s: Split = {
      account_id: SPLIT_ID,

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
      currency: sa[0]?.currency,

      //  ??? Use the first available payee
      payee: t.splits.map(s => s.payee).filter(p => p)[0],
   };

   switch (p.split_mode) {
      case SplitMode.HIDE:
      case SplitMode.COLLAPSED:
      case SplitMode.SUMMARY:
         if (t.splits.length < 3) {
            // Find the split for the account itself, to get balance
            s = {
               ...(
                  accounts.accounts.length > 1
                  ? incomeExpenseSplits(t)[0]
                  : sa![0]
               ),
               amount: s.amount,
               shares: s.shares,
               price: s.price,
               payee: s.payee,
            };

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
                     s.account = s3.account;
                     s.account_id = s3.account_id;
                     break;
                  }
               }
            } else {
               for (const s3 of t.splits) {
                  if (s3.account && accounts.accounts.includes(s3.account)) {
                     s.account = s3.account;
                     s.account_id = s3.account_id;
                     break;
                  }
               }
            }
         }
         break;
   }

   return s;
}


/**
 * Compute the children rows
 */

const getChildren = (d: TableRowData, settings: ComputedBaseLedgerProps) => {
   let result: LogicalRow<TableRowData, ComputedBaseLedgerProps>[] = [];
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
const Ledger: React.FC<BaseLedgerProps & ExtraProps> = p => {
   const accounts = useAccountIds(p.accountIds);
   const date = React.useMemo(
      () => p.date ?? new Date(),
      [p.date]
   );
   const transactions = useTransactions(
      accounts.accounts, p.range, date, p.includeScheduled);
   window.console.log('MANU transactions=', transactions);
   const singleAccount =
      accounts.accounts.length === 1 ? accounts.accounts[0] : undefined;
   const total = React.useMemo(
      () => {
         const v = {...nullTotal};
         if (singleAccount) {
            v.future = transactions?.[transactions.length - 1]?.balanceShares;
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
                  if (v.present === undefined && new Date(t.date) <= date) {
                     v.present = t.balanceShares;
                  }
                  splitsForAccounts(t, accounts.accounts).forEach(addSplit);
               }
            }
         }
         return v;
      },
      [transactions, accounts, date, singleAccount]
   );

   const computed: ComputedBaseLedgerProps = {
      ...p,
      prefs: usePrefs().prefs,
      accounts,
      transactions,
      total,
      singleAccount,
   }
   const isStock = singleAccount?.kind.is_stock;
   const isLiquid = is_liquid(singleAccount?.kind);

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
      p.hideBalance || !isLiquid        ? undefined           : columnBalance,
   ];

   const footColumns = [
      columnTotal,
   ];

   const rows: LogicalRow<TableRowData, ComputedBaseLedgerProps>[] =
      React.useMemo(
      () => transactions?.flatMap(t => [
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
      [singleAccount, p, transactions, accounts]
   );

   return (
      <ListWithColumns
         className="ledgerTable"
         columns={columns}
         rows={rows}
         defaultExpand={p.defaultExpand}
         footColumnsOverride={footColumns}
         scrollToBottom={true}
         sortOn={p.sortOn}
         setSortOn={p.setSortOn}
         settings={computed}
         borders={p.borders}
         rowColors={p.rowColors}
      />
   );
}

export default React.memo(Ledger);
