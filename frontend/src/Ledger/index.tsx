import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import { dateToString } from 'Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Panel from 'Panel';
import Account from 'Account';
import { amountForAccount, firstSplitForAccount,
         AccountId, Split, Transaction } from 'Transaction';
import Numeric from 'Numeric';
import useAccounts from 'services/useAccounts';
import useHistory from 'services/useHistory';
import usePrefs, { LedgerPrefs, SplitMode,
   TransactionMode } from 'services/usePrefs';
import './Ledger.css';

const ROW_HEIGHT = 25;  // pixels

const SPLIT = '--split--';
const SPLIT_ID: AccountId = "";

const splitRowsCount = (
   t: Transaction,
   split_mode: SplitMode,
   expanded: boolean|undefined,
   accountId: AccountId,
): number => {
   if (!expanded) {
      return 0;
   }
   switch (split_mode) {
      case SplitMode.COLLAPSED:
         return (t.splits.length > 2) ? t.splits.length : 0;
      case SplitMode.MULTILINE:
         return t.splits.length;
      case SplitMode.OTHERS:
         return t.splits.filter(s => s.account !== accountId).length;
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
         return t?.memo ? 1 : 0;
      default:
         return 1;
   }
}

/**
 * The column(s) to use to show transaction amounts
 */

const amountColumnsHeaders = (
   valueColumn: boolean,
) => {
   return valueColumn
      ? (
         <TH kind='amount' sortable={true} asc={false}>Amount</TH>
      ) : (
         <>
           <TH kind='amount' sortable={true} asc={false}>Withdrawal</TH>
           <TH kind='amount' sortable={true} asc={true}>Deposit</TH>
         </>
      );
}

const amountColumns = (
   s: Split,
   valueColumn: boolean,
) => {
   return valueColumn
      ? (
         <TD kind='amount'>
            <Numeric amount={s.amount} />
         </TD>
      ) : (
         <>
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
         </>
      );
}

const amountColumnsNotes = (
   valueColumn: boolean,
) => {
   return valueColumn
      ? <TD kind="amount" />
      : (
         <>
            <TD kind="amount" />
            <TD kind="amount" />
         </>
      );
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
   const className = `td ${p.kind || ''} ${p.className || ''}`;
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
   prefs: LedgerPrefs;
   expanded?: boolean;
}
const FirstRow: React.FC<FirstRowProps> = p => {
   const t = p.transaction;
   let s: Split = {
      account: SPLIT_ID,
      reconcile: '',
      amount: amountForAccount(t, p.accountId),
   };

   switch (p.prefs.split_mode) {
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
      case SplitMode.OTHERS:
      case SplitMode.MULTILINE:
         break;
   }

   return (
      <TR>
         <TD kind='date'>{t.date}</TD>
         <TD kind='num' className='numeric'>{s.checknum}</TD>
         <TD kind='payee'>
            <Link to={`/payee/${t.payee}`}>{t.payee}</Link>
         </TD>
         <TD kind='transfer'>
            {
               s.account === SPLIT_ID
               ? SPLIT
               : <Account id={s.account} noLinkIf={p.accountId} />
            }
         </TD>
         <TD kind='reconcile'>{s.reconcile}</TD>
         {
            amountColumns(s, p.prefs.valueColumn)
         }
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
   prefs: LedgerPrefs;
}
const NotesRow: React.FC<NotesRowProps> = p => {
   return (
      <TR>
         <TD kind="date" />
         <TD kind="num"></TD>
         <TD kind="notes">{p.transaction.memo}</TD>
         <TD kind="transfer" />
         <TD kind="reconcile" />
         {
            amountColumnsNotes(p.prefs.valueColumn)
         }
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
   prefs: LedgerPrefs;
}
const SplitRow: React.FC<SplitRowProps> = p => {
   const s = p.split;
   return (
      <TR>
         <TD kind='date' />
         <TD kind='num' className='numeric'>{s.checknum}</TD>
         <TD kind='notes'>{s.memo}</TD>
         <TD kind='transfer'>
            <Account id={s.account} noLinkIf={p.accountId} />
         </TD>
         <TD kind='reconcile'>{s.reconcile}</TD>
         {
            amountColumns(s, p.prefs.valueColumn)
         }
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
   prefs: LedgerPrefs;
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

   if (splitRowsCount(t, p.prefs.split_mode, p.expanded, p.accountId) > 0) {
      let filterSplits: undefined|Split[];

      switch (p.prefs.split_mode) {
         case SplitMode.SUMMARY:
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
                                    <Account id={s.account} />
                                 )
                              </span> : null
                           )
                        }
                     </TD>
                  </TR>
               );
            }
            break;
         case SplitMode.OTHERS:
            filterSplits = t.splits.filter(s => s.account !== p.accountId);
            break;
         default:
            filterSplits = t.splits;
      }

      if (filterSplits) {
         lines = filterSplits.map((s, sid) => (
            <SplitRow
               key={`${t.id} ${sid}`}
               split={s}
               prefs={p.prefs}
               accountId={p.accountId}
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
            prefs={p.prefs}
            accountId={p.accountId}
            expanded={p.expanded}
          />
         {
            noteRowsCount(t, p.prefs.trans_mode, p.expanded) > 0 &&
            <NotesRow transaction={t} prefs={p.prefs} />
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
               <Account id={p.accountId} noLinkIf={p.accountId} />
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
   accountId: AccountId,
) => {
   const r: RowStateProps = {};

   transactions.forEach(t => {
      const rows =
         splitRowsCount(t, split_mode, true, accountId)
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
   setHeader?: (title: string|undefined) => void;
}

const Ledger: React.FC<LedgerProps> = p => {
   const { setHeader } = p;
   const { accounts } = useAccounts();
   const { accountId } = useParams();
   const { pushAccount } = useHistory();
   const [ rowState, setRowState ] = React.useState<RowStateProps>({});
   const [transactions, setTransactions] = React.useState<Transaction[]>([]);
   const { prefs } = usePrefs();
   const opt = prefs.ledgers;
   const list = React.useRef<VariableSizeList>(null);

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(`/api/ledger/${accountId}`);
            const data = await resp.json();
            setTransactions(data);
         }
         dofetch();
         pushAccount(accountId);
      },
      [accountId, pushAccount]
   );

   const name = accounts.name(accountId);

   React.useEffect(
      () => setHeader?.(name),
      [name, setHeader]
   );

   //  window.console.log('Render ledger', account,
   //     p.transactions.length,
   //     Object.keys(rowState).length);

   React.useLayoutEffect(
      () => {
         setRowState(setupLogicalRows(
            transactions,
            opt.trans_mode, opt.split_mode,
            opt.defaultExpand,
            accountId));
         if (list.current) {
            list.current!.resetAfterIndex(0);
         }
      },
      [transactions, accountId, opt.split_mode, opt.trans_mode,
       opt.defaultExpand]
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

   const [future, present, reconciled, cleared, selected] = React.useMemo(
      () => {
         const future = transactions[transactions.length - 1]?.balance;
         const formatted = dateToString("today");

         let present: undefined|number;
         let reconciled: number = 0;
         let cleared: number = 0;
         let selected: undefined|number;

         const addSplit = (s: Split) => {
            switch (s.reconcile) {
               case 'R': reconciled += s.amount; break;
               case 'C': cleared += s.amount; break;
               default: break;
            }
         }

         for (let j = transactions.length - 1; j >= 0; j--) {
            const t = transactions[j];
            if (present === undefined && t.date <= formatted) {
               present = t.balance;
            }
            t.splits.filter(s => s.account === accountId).forEach(addSplit);
         }

         return [future, present, reconciled, cleared, selected];
      },
      [transactions, accountId]
   );

   const Row = React.useCallback(
      (r: ListChildComponentProps) => {
         const t = transactions[r.index];
         delete r.style['width'];   // set in the CSS
         return (
            <TransactionRow
               style={r.style}
               transaction={t}
               accountId={accountId}
               prefs={opt}
               expanded={rowState[t.id]?.expanded}
               setExpanded={setTransactionExpanded}
            />
         );
      },
      [transactions, setTransactionExpanded, rowState, accountId, opt ]
   );

   const getTransactionHeight = React.useCallback(
      (index: number) => {
         const t = transactions[index];
         const d = rowState[t?.id];
         return ROW_HEIGHT * (
            1
            + noteRowsCount(t, opt.trans_mode, d?.expanded)
            + splitRowsCount(t, opt.split_mode, d?.expanded, accountId));
      },
      [rowState, transactions, opt.trans_mode, accountId,
       opt.split_mode]
   );

   const getTransactionKey = (index: number) => {
      return transactions[index].id;
   }

   const className = 'ledger'
      + (opt.borders ? ' borders' : '')
      // no background necessary if we are only ever going to display one line
      // per transaction
      + (opt.trans_mode === TransactionMode.ONE_LINE
         && opt.split_mode === SplitMode.HIDE
         ? ''
         : ' background'
        );

   return (
      <Panel className={className} >
         <div className="thead">
            <TR>
               <TH kind='date' sortable={true}>Date</TH>
               <TH kind='num' className="numeric" sortable={true}>Num</TH>
               <TH kind='payee' sortable={true}>Payee/Memos</TH>
               <TH kind='transfer' sortable={true}>From/To</TH>
               <TH kind='reconcile'>R</TH>
               {
                  amountColumnsHeaders(opt.valueColumn)
               }
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
                        itemCount={transactions.length}
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
            <EditingRow accountId={accountId} />
         }

         <div className="tfoot">
            <TR partial={true}>
               {
                  selected !== undefined &&
                  <TD>
                     selected:
                     <Numeric amount={selected} />
                  </TD>
               }
               {
                  reconciled  // also omit when 0
                  ? (
                     <TD>
                        reconciled:
                        <Numeric amount={reconciled} />
                     </TD>
                  ) : null
               }
               {
                  cleared  // also omit when 0
                  ? (
                     <TD>
                        cleared:
                        <Numeric amount={cleared} />
                     </TD>
                  ) : null
               }
               {
                  present !== undefined &&
                  <TD>
                     present:
                     <Numeric amount={present} />
                  </TD>
               }
               {
                  future !== undefined &&
                  future !== present &&
                  <TD>
                     future:
                     <Numeric amount={future} />
                  </TD>
               }
            </TR>
         </div>
      </Panel>
   );
}

export default Ledger;
