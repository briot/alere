import React from 'react';
import { amountForAccount, firstSplitForAccount,
         Split, Transaction } from 'Transaction';
import Numeric from 'Numeric';
import './Ledger.css';

export enum SplitMode {
   HIDE,       // never show the splits
   MULTILINE,  // one line per split in a transaction
   COLLAPSED,  // same as multiline, but do not show splits if there are only
               // two accounts involved
   SUMMARY,    // only one line for all splits (when more than two)
}

export enum TransactionMode {
   ONE_LINE,   // only use one line (notes are never displayed)
   AUTO,       // transactions use two lines if they have notes
   TWO_LINES,  // transactions always use two lines (to show notes)
}


interface LedgerOptions {
   trans_mode: TransactionMode;
   split_mode: SplitMode;
}

/**
 * A header cell
 */

interface THProps {
   sortable?: boolean;
   asc?: boolean; // if sorted (not undefined), whether ascending or descending
   kind?: string;
}
const TH: React.FC<THProps> = p => {
   const sortClass = p.sortable ? 'sortable' : '';
   const ascClass = p.asc === undefined ? '' : p.asc ? 'sort-up' : 'sort-down';
   const className = `th ${p.kind || ''} ${sortClass} ${ascClass}`;
   return (
       <span className={className}>
          {p.children}
       </span>
   );
}

/**
 * A standard cell
 */

interface TDProps {
   kind?: string;
}
const TD: React.FC<TDProps> = p => {
   const className = `td ${p.kind}`;
   return (
      <span className={className}>
         {p.children}
      </span>
   );
}

/**
 * A row in the table
 */

interface TRProps {
   partial?: boolean;  // if yes, cells will be aligned to the right
   expanded?: boolean; // undefined if not expandable, otherwise true|false
   details?: boolean;
}
const TR: React.FC<TRProps> = p => {
   const expClass = p.expanded === undefined ? ''
       : p.expanded ? 'expandable expanded'
       : 'expandable';
   const detClass = p.details ? 'details' : '';
   const className = `tr ${p.partial ? 'right-aligned' : ''} ${expClass} ${detClass}`;
   return (
      <div className={className} >
         {p.children}
      </div>
   );
}

/**
 * The first two for a transaction.
 * It will show either the single split associated with the transaction, or a
 * summary of all the splits.
 */

interface FirstRowProps {
   transaction: Transaction;
   accountName: string;
   options: LedgerOptions;
}
const FirstRow: React.FC<FirstRowProps> = p => {
   const t = p.transaction;
   let s: Split = {
      account: '--split--',
      reconcile: '',
      amount: amountForAccount(t, p.accountName),
   };

   switch (p.options.split_mode) {
      case SplitMode.HIDE:
      case SplitMode.COLLAPSED:
      case SplitMode.SUMMARY:
         if (t.splits.length < 3) {
            const s2 = firstSplitForAccount(t, p.accountName);
            s = {...s2, amount: s.amount};
         }
         break;
      case SplitMode.MULTILINE:
         break;
   }

   return (
      <TR>
         <TD kind='date'>{t.date}</TD>
         <TD kind='num'>{s.num}</TD>
         <TD kind='payee'>{t.payee}</TD>
         <TD kind='transfer'>{s.account}</TD>
         <TD kind='reconcile'>{s.reconcile || 'n'}</TD>
         <TD kind='amount'>
            {
               s.amount < 0 && (
                  <Numeric amount={Math.abs(s.amount)} />
               )
            }
         </TD>
         <TD kind='amount'>
            {
               s.amount >= 0 && (
                  <Numeric amount={s.amount} />
               )
            }
         </TD>
         <TD kind='amount'>
            <Numeric amount={t.balance} />
         </TD>
      </TR>
   );
}

/**
 * The row that shows the details for a transaction
 */

interface NotesRowProps {
   transaction: Transaction;
   options: LedgerOptions;
}
const NotesRow: React.FC<NotesRowProps> = p => {
   switch (p.options.trans_mode) {
      case TransactionMode.ONE_LINE:
         return null;
      case TransactionMode.AUTO:
         if (!p.transaction.notes) {
            return null;
         }
         /* fall through */
      default:
         return (
            <div className="tr double">
               <TD kind="date" />
               <TD kind="num"></TD>
               <TD kind="payee">{p.transaction.notes}</TD>
               <TD kind="transfer" />
               <TD kind="reconcile" />
               <TD kind="amount" />
               <TD kind="amount" />
               <TD kind="amount" />
            </div>
         );
   }
}

/**
 * Split details
 */

interface SplitRowProps {
   split: Split;
}
const SplitRow: React.FC<SplitRowProps> = p => {
   const s = p.split;
   return (
      <TR details={true}>
         <TD kind='date' />
         <TD kind='num'>{s.num}</TD>
         <TD kind='payee' />
         <TD kind='transfer'>{s.account}</TD>
         <TD kind='reconcile'>{s.reconcile || 'n'}</TD>
         <TD kind='amount'>
            {
               s.amount < 0 && (
                  <Numeric amount={Math.abs(s.amount)} />
               )
            }
         </TD>
         <TD kind='amount'>
            {
               s.amount >= 0 && (
                  <Numeric amount={s.amount} />
               )
            }
         </TD>
         <TD kind='amount' />
      </TR>
   );
}

/**
 * One or more rows to describe a transaction
 */

interface TransactionRowProps {
   transaction: Transaction;
   accountName: string;
   options: LedgerOptions;
}

const TransactionRow: React.FC<TransactionRowProps> = p => {
   const t = p.transaction;
   let lines: (JSX.Element|null)[] = [];

   switch (p.options.split_mode) {
      case SplitMode.COLLAPSED:
         if (t.splits.length > 2) {
            lines = t.splits.map((s, sid) => (
               <SplitRow split={s} key={`${t.id} ${sid}`} />
            ));
         }
         break;
      case SplitMode.MULTILINE:
         lines = t.splits.map((s, sid) => (
            <SplitRow split={s} key={`${t.id} ${sid}`} />
         ));
         break;

      case SplitMode.SUMMARY:
         const amount = amountForAccount(t, p.accountName);
         if (t.splits.length > 2) {
            lines = [
               <TR partial={true} details={true}>
                  <TD>
                     <Numeric amount={amount} />
                     &nbsp;=&nbsp;
                     {
                        t.splits.map(s =>
                           (s.account !== p.accountName)
                           ? [
                              <span>{ s.amount >= 0 ? ' - ' : ' + ' }</span>,
                              <Numeric amount={Math.abs(s.amount)} />,
                              ' (',
                              <a href='#'>{s.account}</a>,
                              ')'
                           ] : null
                        )
                     }
                  </TD>
               </TR>
            ];
         }
         break;
   }

   return (
      <>
         <FirstRow
            transaction={t}
            options={p.options}
            accountName={p.accountName}
          />
         <NotesRow transaction={t} options={p.options} />
         {lines}
      </>
   );
}

interface LedgerProps {
   accountName: string;
   transactions: Transaction[];
   options: LedgerOptions;
}

const Ledger: React.FC<LedgerProps> = p => {
   const className = 'ledger'

      // no background necessary if we are only ever going to display one line
      // per transaction
      + (p.options.trans_mode === TransactionMode.ONE_LINE
         && p.options.split_mode === SplitMode.HIDE
         ? ''
         : ' background'
        );

   return (
      <div id='main' className={className} >
         <div className="thead">
            <TR>
               <TH kind='date' sortable={true}>Date</TH>
               <TH kind='num' sortable={true}>Num</TH>
               <TH kind='payee' sortable={true}>Payee</TH>
               <TH kind='transfer' sortable={true}>From/To</TH>
               <TH kind='reconcile'>R</TH>
               <TH kind='amount' sortable={true} asc={false}>Withdrawal</TH>
               <TH kind='amount' sortable={true} asc={true}>Deposit</TH>
               <TH kind='amount' >Balance</TH>
               <div className="scrollbar-width"></div>
            </TR>
         </div>

         <div className="tbody">
            {
               p.transactions.map(t => (
                  <TransactionRow
                     key={t.id}
                     transaction={t}
                     accountName={p.accountName}
                     options={p.options}
                  />
               ))
            }
         </div>

         <div className="tfoot">
            <TR partial={true}>
               <TH>
                  Selected:
                  <Numeric amount={0} />
               </TH>
               <TH>
                  Cleared:
                  <Numeric amount={0} />
               </TH>
               <TH>
                  Reconciled:
                  <Numeric amount={0} />
               </TH>
               <TH>
                  Present:
                  <Numeric amount={3421.10} currency="euro" />
               </TH>
               <div className="scrollbar-width"></div>
            </TR>
         </div>
      </div>
   );
}

export default Ledger;
