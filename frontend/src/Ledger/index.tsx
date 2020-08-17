import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import { DateRange, dateToString, rangeDisplay, rangeToHttp } from 'Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Panel, { SetHeaderProps } from 'Panel';
import Account from 'Account';
import { amountForAccounts, splitsForAccounts, amountIncomeExpense,
         incomeExpenseSplits, AccountIdList, AccountId,
         Split, Transaction } from 'Transaction';
import Numeric from 'Numeric';
import useAccounts, { AccountList } from 'services/useAccounts';
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
   expanded: boolean | undefined,
   accountIds: AccountIdList | undefined,
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
         return accountIds === undefined
            ? t.splits.length
            : splitsForAccounts(t, accountIds).length;
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
   accounts: AccountList;
   accountIds: AccountIdList|undefined;
   prefs: LedgerPrefs;
   expanded?: boolean;
}
const FirstRow: React.FC<FirstRowProps> = p => {
   const t = p.transaction;
   let s: Split = {
      account: SPLIT_ID,
      reconcile: '',
      amount: p.accountIds === undefined
         ? amountIncomeExpense(t, p.accounts)
         : amountForAccounts(t, p.accountIds),
   };

   switch (p.prefs.split_mode) {
      case SplitMode.HIDE:
      case SplitMode.COLLAPSED:
      case SplitMode.SUMMARY:
         if (t.splits.length < 3) {
            // Find the split for the account itself, to get balance
            const splits = p.accountIds === undefined
               ? incomeExpenseSplits(t, p.accounts)[0]
               : splitsForAccounts(t, p.accountIds)[0];
            const s2 = {...splits};

            // Find the split not for the account, to get the target account
            for (const s3 of t.splits) {
               if (p.accountIds === undefined
                   && p.accounts.isIncomeExpense(s3.account)
               ) {
                  s2.account = s3.account;
                  break;
               } else if (p.accountIds !== undefined &&
                          !p.accountIds.includes(s3.account)
               ) {
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
               : <Account id={s.account} noLinkIf={p.accountIds} />
            }
         </TD>
         {
            !p.prefs.hideReconcile &&
            <TD kind='reconcile'>{s.reconcile}</TD>
         }
         {
            amountColumns(s, p.prefs.valueColumn)
         }
         {
            !p.prefs.hideBalance &&
            <TD kind='amount'>
               <Numeric amount={t.balance} />
            </TD>
         }
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
         {
            !p.prefs.hideReconcile &&
            <TD kind="reconcile" />
         }
         {
            amountColumnsNotes(p.prefs.valueColumn)
         }
         {
            !p.prefs.hideBalance &&
            <TD kind="amount" />
         }
      </TR>
   );
}

/**
 * Split details
 */

interface SplitRowProps {
   split: Split;
   accountIds: AccountIdList|undefined;
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
            <Account id={s.account} noLinkIf={p.accountIds} />
         </TD>
         {
            !p.prefs.hideReconcile &&
            <TD kind='reconcile'>{s.reconcile}</TD>
         }
         {
            amountColumns(s, p.prefs.valueColumn)
         }
         {
            !p.prefs.hideBalance &&
            <TD kind='amount' />
         }
      </TR>
   );
}

/**
 * One or more rows to describe a transaction
 */

interface TransactionRowProps {
   transaction: Transaction;
   accounts: AccountList;
   accountIds: AccountIdList|undefined;
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

   if (splitRowsCount(t, p.prefs.split_mode, p.expanded, p.accountIds) > 0) {
      let filterSplits: undefined|Split[];

      switch (p.prefs.split_mode) {
         case SplitMode.SUMMARY:
            const amount = p.accountIds === undefined
                ? amountIncomeExpense(t, p.accounts)
                : amountForAccounts(t, p.accountIds);
            if (t.splits.length > 2) {
               lines = (
                  <TR partial={true}>
                     <TD>
                        <Numeric amount={amount} />
                        &nbsp;=&nbsp;
                        {
                           t.splits.map((s, index) =>
                              (p.accountIds === undefined
                                 || !p.accountIds.includes(s.account)
                              ) ? <span key={index}>
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
            filterSplits = p.accountIds === undefined
                ? t.splits
                : splitsForAccounts(t, p.accountIds);
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
               accountIds={p.accountIds}
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
            accounts={p.accounts}
            accountIds={p.accountIds}
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
               <Account id={p.accountId} noLinkIf={[p.accountId]} />
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
   accountIds: AccountIdList|undefined,
) => {
   const r: RowStateProps = {};

   transactions.forEach(t => {
      const rows =
         splitRowsCount(t, split_mode, true, accountIds)
         + noteRowsCount(t, trans_mode, true);

      r[t.id] = {
         expanded: rows > 0 ? defaultExpand : undefined,
      };
   });

   return r;
}

/**
 * The full ledger, for a panel
 */

export interface LedgerProps extends LedgerPrefs {
   accountIds: AccountIdList | undefined;  // undefined for all accounts
   range?: DateRange|undefined;      // undefined, to see forever
}

const Ledger: React.FC<LedgerProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const { accounts } = useAccounts();
   const { pushAccount } = useHistory();
   const [ rowState, setRowState ] = React.useState<RowStateProps>({});
   const [transactions, setTransactions] = React.useState<Transaction[]>([]);
   const list = React.useRef<VariableSizeList>(null);

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               '/api/ledger/'
               + (p.accountIds === undefined
                   ? '' : p.accountIds.join(','))
               + `?${rangeToHttp(p.range)}`
            );
            const data: Transaction[] = await resp.json();

            if (p.accountIds === undefined) {
               // remove internal transfers
               setTransactions(data.filter(t =>
                  incomeExpenseSplits(t, accounts).length > 0));
            } else {
               setTransactions(data);
            }
         }
         dofetch();
      },
      [p.accountIds, p.range, accounts]
   );

   React.useEffect(
      () => {
         if (p.accountIds && p.accountIds.length === 1) {
            pushAccount(p.accountIds[0]);
         }
      },
      [p.accountIds, pushAccount]
   );

   React.useEffect(
      () => {
         const name = p.accountIds === undefined
            ? 'All accounts'
            : p.accountIds.length === 1
            ? accounts.name(p.accountIds[0])
            : 'Multiple accounts';
         const dates = p.range ? rangeDisplay(p.range) : '';
         setHeader?.(`${name} ${dates}`);
      },
      [p.accountIds, accounts, setHeader, p.range]
   );

   React.useLayoutEffect(
      () => {
         setRowState(setupLogicalRows(
            transactions,
            p.trans_mode, p.split_mode,
            p.defaultExpand,
            p.accountIds));
         if (list.current) {
            list.current!.resetAfterIndex(0);
         }
      },
      [transactions, p.accountIds, p.split_mode, p.trans_mode,
       p.defaultExpand]
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
            if (p.accountIds === undefined) {
               t.splits.forEach(addSplit);
            } else {
               splitsForAccounts(t, p.accountIds).forEach(addSplit);
            }
         }

         return [future, present, reconciled, cleared, selected];
      },
      [transactions, p.accountIds]
   );

   const Row = React.useCallback(
      (r: ListChildComponentProps) => {
         const t = transactions[r.index];
         delete r.style['width'];   // set in the CSS
         return (
            <TransactionRow
               style={r.style}
               transaction={t}
               accounts={accounts}
               accountIds={p.accountIds}
               prefs={p}
               expanded={rowState[t.id]?.expanded}
               setExpanded={setTransactionExpanded}
            />
         );
      },
      [transactions, setTransactionExpanded, rowState, p, accounts ]
   );

   const getTransactionHeight = React.useCallback(
      (index: number) => {
         const t = transactions[index];
         const d = rowState[t?.id];
         return ROW_HEIGHT * (
            1
            + noteRowsCount(t, p.trans_mode, d?.expanded)
            + splitRowsCount(t, p.split_mode, d?.expanded, p.accountIds));
      },
      [rowState, transactions, p.trans_mode, p.accountIds,
       p.split_mode]
   );

   const getTransactionKey = (index: number) => {
      return transactions[index].id;
   }

   const className = 'ledger'
      + (p.borders ? ' borders' : '')
      // no background necessary if we are only ever going to display one line
      // per transaction
      + (p.trans_mode === TransactionMode.ONE_LINE
         && p.split_mode === SplitMode.HIDE
         ? ''
         : ' background'
        );

   return (
      <div className={className} >
         <div className="thead">
            <TR>
               <TH kind='date' sortable={true}>Date</TH>
               <TH kind='num' className="numeric" sortable={true}>Num</TH>
               <TH kind='payee' sortable={true}>Payee/Memos</TH>
               <TH kind='transfer' sortable={true}>From/To</TH>
               {
                  !p.hideReconcile &&
                  <TH kind='reconcile'>R</TH>
               }
               {
                  amountColumnsHeaders(p.valueColumn)
               }
               {
                  !p.hideBalance &&
                  <TH kind='amount' >Balance</TH>
               }
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

         {/*
            p.accountIds && p.accountIds.length === 1 &&
            <EditingRow accountId={p.accountIds[0] as AccountId} />
            */
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
      </div>
   );
}

interface LedgerPageProps {
   setHeader: (title: string|undefined) => void;
}
export const LedgerPage: React.FC<LedgerPageProps> = p => {
   const { accountId } = useParams();
   const { prefs } = usePrefs();
   return (
      <Panel className="main-area" >
         <Ledger
            setHeader={p.setHeader}
            accountIds={[accountId]}
            hideBalance={false}
            {...prefs.ledgers}
         />
      </Panel>
   );
}

export default Ledger;
