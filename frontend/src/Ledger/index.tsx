import React from 'react';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { amountForAccount, firstSplitForAccount,
         AccountId, Split, Transaction } from 'Transaction';
import Numeric from 'Numeric';
import useAccounts, { AccountList } from 'services/useAccounts';
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

const ROW_HEIGHT = 25;  // pixels

const SPLIT = '--split--';
const SPLIT_ID: AccountId = "";

export interface LedgerOptions {
   trans_mode: TransactionMode;
   split_mode: SplitMode;
   borders: boolean;
   defaultExpand: boolean;
}

const splitRowsCount = (
   t: Transaction,
   split_mode: SplitMode,
   expanded: boolean|undefined,
): number => {
   if (!expanded) {
      return 0;
   }
   switch (split_mode) {
      case SplitMode.COLLAPSED:
         return (t.splits.length > 2) ? t.splits.length : 0;
      case SplitMode.MULTILINE:
         return t.splits.length;
      case SplitMode.SUMMARY:
         return (t.splits.length > 2) ? 1 : 0;
      default:
         return 0;
   }
}

const noteRowsCount = (
   t: Transaction,
   trans_mode: TransactionMode,
   expanded: boolean|undefined,
): number => {
   if (!expanded) {
      return 0;
   }

   switch (trans_mode) {
      case TransactionMode.ONE_LINE:
         return 0;
      case TransactionMode.AUTO:
         return (t?.notes !== undefined) ? 1 : 0;
      default:
         return 1;
   }
}

/**
 * A header cell
 */

interface THProps {
   sortable?: boolean;
   asc?: boolean; // if sorted (not undefined), whether ascending or descending
   kind?: string;
   className?: string;
}
const TH: React.FC<THProps> = p => {
   const sortClass = p.sortable ? 'sortable' : '';
   const ascClass = p.asc === undefined ? '' : p.asc ? 'sort-up' : 'sort-down';
   return (
       <span className={`th ${p.kind || ''} ${sortClass} ${ascClass} ${p.className || ''}`}>
          {p.children}
       </span>
   );
}

/**
 * A standard cell
 */

interface TDProps {
   kind?: string;
   className?: string;
}
const TD: React.FC<TDProps> = p => {
   const className = `td ${p.kind} ${p.className || ''}`;
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
   editable?: boolean;
}
const TR: React.FC<TRProps> = p => {
   const editClass = p.editable ? 'edit' : '';
   const className = `tr ${p.partial ? 'right-aligned' : ''} ${editClass}`;
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
   accountId: AccountId;
   accounts: AccountList;
   options: LedgerOptions;
   expanded?: boolean;
}
const FirstRow: React.FC<FirstRowProps> = p => {
   const t = p.transaction;
   let s: Split = {
      account: SPLIT_ID,
      reconcile: '',
      amount: amountForAccount(t, p.accountId),
   };

   switch (p.options.split_mode) {
      case SplitMode.HIDE:
      case SplitMode.COLLAPSED:
      case SplitMode.SUMMARY:
         if (t.splits.length < 3) {
            // Find the split for the account itself, to get balance
            const s2 = {
               ...firstSplitForAccount(t, p.accountId)
            };

            // Find the split not for the account, to get the target account
            for (const s3 of t.splits) {
               if (s3.account !== p.accountId) {
                  s2.account = s3.account;
                  break;
               }
            }

            s = {...s2, amount: s.amount};
         }
         break;
      case SplitMode.MULTILINE:
         break;
   }

   return (
      <TR>
         <TD kind='date'>{t.date}</TD>
         <TD kind='num' className='numeric'>{s.checknum}</TD>
         <TD kind='payee'><a href='#a'>{t.payee}</a></TD>
         <TD kind='transfer'>
            {
               s.account === SPLIT_ID
               ? SPLIT
               : s.account !== p.accountId
               ? <a href='#a'>{p.accounts.name(s.account)}</a>
               : p.accounts.name(s.account)
            }
         </TD>
         <TD kind='reconcile'>{s.reconcile}</TD>
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
   return (
      <TR>
         <TD kind="date" />
         <TD kind="num"></TD>
         <TD kind="payee">{p.transaction.notes}</TD>
         <TD kind="transfer" />
         <TD kind="reconcile" />
         <TD kind="amount" />
         <TD kind="amount" />
         <TD kind="amount" />
      </TR>
   );
}

/**
 * Split details
 */

interface SplitRowProps {
   split: Split;
   accountId: AccountId;
   accounts: AccountList;
}
const SplitRow: React.FC<SplitRowProps> = p => {
   const s = p.split;
   return (
      <TR>
         <TD kind='date' />
         <TD kind='num' className='numeric'>{s.checknum}</TD>
         <TD kind='payee'>{s.notes}</TD>
         <TD kind='transfer'>
            {
               s.account !== p.accountId
               ? <a href='#a'>{p.accounts.name(s.account)}</a>
               : p.accounts.name(s.account)
            }
         </TD>
         <TD kind='reconcile'>{s.reconcile}</TD>
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
   accountId: AccountId;
   accounts: AccountList;
   options: LedgerOptions;
   style?: React.CSSProperties;
   expanded: undefined|boolean;
   setExpanded: (tr: Transaction, expanded: boolean) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = p => {
   const t = p.transaction;
   const { setExpanded } = p;

   const onExpand = React.useCallback(
      () => setExpanded(t, !p.expanded),
      [setExpanded, p.expanded, t]
   );

   let lines: (JSX.Element|null)[] | JSX.Element = [];

   const expClass = 'trgroup ' + (
       p.expanded === undefined ? ''
       : p.expanded ? 'expandable expanded'
       : 'expandable collapsed'
   );

   if (splitRowsCount(t, p.options.split_mode, p.expanded) > 0) {
      if (p.options.split_mode === SplitMode.SUMMARY) {
         const amount = amountForAccount(t, p.accountId);
         if (t.splits.length > 2) {
            lines = (
               <TR partial={true}>
                  <TD>
                     <Numeric amount={amount} />
                     &nbsp;=&nbsp;
                     {
                        t.splits.map((s, index) =>
                           (s.account !== p.accountId)
                           ? <span key={index}>
                              <span>{ s.amount >= 0 ? ' - ' : ' + ' }</span>
                              <Numeric amount={Math.abs(s.amount)} />
                              (
                              <a href='#a'>{p.accounts.name(s.account)}</a>
                              )
                           </span> : null
                        )
                     }
                  </TD>
               </TR>
            );
         }
      } else {
         lines = t.splits.map((s, sid) => (
            <SplitRow
               key={`${t.id} ${sid}`}
               split={s}
               accountId={p.accountId}
               accounts={p.accounts}
            />
         ));
      }
   }

   return (
      <div
         className={expClass}
         onClick={p.expanded === undefined ? undefined : onExpand}
         style={p.style}
      >
         <FirstRow
            transaction={t}
            options={p.options}
            accountId={p.accountId}
            accounts={p.accounts}
            expanded={p.expanded}
          />
         {
            noteRowsCount(t, p.options.trans_mode, p.expanded) > 0 &&
            <NotesRow transaction={t} options={p.options} />
         }
         {lines}
      </div>
   );
}

/**
 * A row to edit a new transaction
 */

interface EditingRowProps {
   accountId: AccountId;
   accounts: AccountList;
}

const EditingRow: React.FC<EditingRowProps> = p => {
   return (
      <div className="trgroup">
         <TR editable={true} >
            <TD kind='date'>
               <input type="date" placeholder="2020-07-01" tabIndex={1} />
            </TD>
            <TD kind='num'>
               <input placeholder="num" />
            </TD>
            <TD kind='payee'>
               <input placeholder="payee" tabIndex={2} />
            </TD>
            <TD kind='transfer' />
            <TD kind='reconcile' />
            <TD kind='amount' />
            <TD kind='amount' />
            <TD kind='amount'>
               <button className="fa fa-check" tabIndex={13} />
            </TD>
         </TR>
         <TR editable={true} >
            <TD kind='date' />
            <TD kind='num'>
               <input placeholder="action" tabIndex={3} />
            </TD>
            <TD kind='payee'>
               <input placeholder="notes" tabIndex={4} />
            </TD>
            <TD kind='transfer'>
               {p.accounts.name(p.accountId)}
            </TD>
            <TD kind='reconcile'>
               <select>
                  <option>n</option>
                  <option>C</option>
                  <option>R</option>
               </select>
            </TD>
            <TD kind='amount'>
               <input
                  type="numeric"
                  placeholder="0.00"
                  tabIndex={6}
                  style={{textAlign: 'right'}}
               />
            </TD>
            <TD kind='amount'>
               <input
                  type="numeric"
                  placeholder="0.00"
                  tabIndex={7}
                  style={{textAlign: 'right'}}
               />
            </TD>
            <TD kind='amount'>
               <button className="fa fa-ban" />
            </TD>
         </TR>
         <TR editable={true} >
            <TD kind='date' />
            <TD kind='num'>
               <input placeholder="action" tabIndex={8} />
            </TD>
            <TD kind='payee'>
               <input placeholder="notes" tabIndex={9} />
            </TD>
            <TD kind='transfer'>
               <input placeholder="transfer to/from" tabIndex={10} />
            </TD>
            <TD kind='reconcile' />
            <TD kind='amount'>
               <input
                  type="numeric"
                  placeholder="0.00"
                  tabIndex={11}
                  style={{textAlign: 'right'}}
               />
            </TD>
            <TD kind='amount'>
               <input
                  type="numeric"
                  placeholder="0.00"
                  tabIndex={12}
                  style={{textAlign: 'right'}}
               />
            </TD>
            <TD kind='amount' />
         </TR>
      </div>
   );
}

/**
 * The logical rows of the table (one transaction is one logical row, but
 * occupies multiple rows on the screen).
 */

interface RowState {
   expanded: undefined|boolean;
}

type RowStateProps = { [transactionId: string]: RowState|undefined };

const setupLogicalRows = (
   transactions: Transaction[],
   trans_mode: TransactionMode,
   split_mode: SplitMode,
   defaultExpand: boolean,
) => {
   const r: RowStateProps = {};

   transactions.forEach(t => {
      const rows =
         splitRowsCount(t, split_mode, true)
         + noteRowsCount(t, trans_mode, true);

      r[t.id] = {
         expanded: rows > 0 ? defaultExpand : undefined,
      };
   });

   return r;
}

/**
 * The full ledger
 */

interface LedgerProps {
   accountId: AccountId;
   transactions: Transaction[];
   options: LedgerOptions;
}

const Ledger: React.FC<LedgerProps> = p => {
   const { accounts } = useAccounts();
   const [ rowState, setRowState ] = React.useState<RowStateProps>({});
   const list = React.useRef<VariableSizeList>(null);

   const account = accounts.get_account(p.accountId);

   //  window.console.log('Render ledger', account,
   //     p.transactions.length,
   //     Object.keys(rowState).length);

   React.useLayoutEffect(
      () => {
         setRowState(setupLogicalRows(
            p.transactions, p.options.trans_mode, p.options.split_mode,
            p.options.defaultExpand));
         if (list.current) {
            list.current!.resetAfterIndex(0);
         }
      },
      [p.transactions, p.options.split_mode, p.options.trans_mode,
       p.options.defaultExpand]
   );

   const setTransactionExpanded = React.useCallback(
      (tr: Transaction, expanded: boolean) => {
         if (list.current) {
            // ??? Could optimize and only recompute after this row
            list.current!.resetAfterIndex(0);
         }
         setRowState(old => ({
               ...old,
               [tr.id]: {expanded},
         }));
      },
      []
   );

   const Row = React.useCallback(
      (r: ListChildComponentProps) => {
         const t = p.transactions[r.index];
         delete r.style['width'];   // set in the CSS
         return (
            <TransactionRow
               style={r.style}
               transaction={t}
               accountId={p.accountId}
               accounts={accounts}
               options={p.options}
               expanded={rowState[t.id]?.expanded}
               setExpanded={setTransactionExpanded}
            />
         );
      },
      [p.transactions, setTransactionExpanded, rowState, accounts,
       p.accountId, p.options]
   );

   const getTransactionHeight = React.useCallback(
      (index: number) => {
         const t = p.transactions[index];
         const d = rowState[t?.id];
         return ROW_HEIGHT * (
            1
            + noteRowsCount(t, p.options.trans_mode, d?.expanded)
            + splitRowsCount(t, p.options.split_mode, d?.expanded));
      },
      [rowState, p.transactions, p.options.trans_mode, p.options.split_mode]
   );

   const getTransactionKey = (index: number) => {
      return p.transactions[index].id;
   }

   if (!account) { // || Object.keys(rowState).length !== p.transactions.length) {
      return <div>Loading...</div>
   }

   const className = 'ledger'
      + (p.options.borders ? ' borders' : '')
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
               <TH kind='num' className="numeric" sortable={true}>Num</TH>
               <TH kind='payee' sortable={true}>Payee</TH>
               <TH kind='transfer' sortable={true}>From/To</TH>
               <TH kind='reconcile'>R</TH>
               <TH kind='amount' sortable={true} asc={false}>Withdrawal</TH>
               <TH kind='amount' sortable={true} asc={true}>Deposit</TH>
               <TH kind='amount' >Balance</TH>
            </TR>
         </div>

         <div className="tbody">
            <AutoSizer>
               {
                  ({width, height}) => (
                     <VariableSizeList
                        ref={list}
                        height={height}
                        width={width}
                        itemCount={p.transactions.length}
                        itemSize={getTransactionHeight}
                        itemKey={getTransactionKey}
                     >
                        {Row}
                     </VariableSizeList>
                  )
               }
            </AutoSizer>
         </div>

         {
            false &&
            <EditingRow accountId={p.accountId} accounts={accounts} />
         }

         <div className="tfoot">
            <TR partial={true}>
               <TD>
                  Selected:
                  <Numeric amount={0} />
               </TD>
               <TD>
                  Cleared:
                  <Numeric amount={0} />
               </TD>
               <TD>
                  Reconciled:
                  <Numeric amount={0} />
               </TD>
               <TD>
                  Present:
                  <Numeric amount={3421.10} currency="euro" />
               </TD>
            </TR>
         </div>
      </div>
   );
}

export default Ledger;
