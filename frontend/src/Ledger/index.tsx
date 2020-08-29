import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import { DateRange, dateToString, rangeDisplay } from 'Dates';
import Table from 'List';
import Panel, { SetHeaderProps } from 'Panel';
import AccountName from 'Account';
import { amountForAccounts, splitsForAccounts, amountIncomeExpense,
         incomeExpenseSplits, sharesForAccounts, priceForAccounts,
         splitsNotForAccounts, Split, Transaction } from 'Transaction';
import Numeric from 'Numeric';
import useAccounts, { Account, AccountId } from 'services/useAccounts';
import useHistory from 'services/useHistory';
import useAccountIds from 'services/useAccountIds';
import useTransactions from 'services/useTransactions';
import usePrefs, { LedgerPrefs, SplitMode,
   TransactionMode } from 'services/usePrefs';
import PriceHistory from 'PriceHistory';
import './Ledger.css';

const SPLIT = '--split--';
const SPLIT_ID: AccountId = "";

const splitRowsCount = (
   t: Transaction,
   split_mode: SplitMode,
   expanded: boolean | undefined,
   accounts: Account[] | undefined,
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
         const d = accounts === undefined
            ? t.splits.length
            : splitsNotForAccounts(t, accounts).length;
         return d > 1 ? d : 0;
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
         <Table.TH kind='amount' sortable={true} asc={false}>Amount</Table.TH>
      ) : (
         <>
           <Table.TH kind='amount' sortable={true} asc={false}>Withdrawal</Table.TH>
           <Table.TH kind='amount' sortable={true} asc={true}>Deposit</Table.TH>
         </>
      );
}

const amountColumns = (
   s: Split,
   valueColumn: boolean,
) => {
   return valueColumn
      ? (
         <Table.TD kind='amount'>
            <Numeric amount={s.amount} />
         </Table.TD>
      ) : (
         <>
            <Table.TD kind='amount'>
               {
                  s.amount < 0 && (
                     <Numeric amount={Math.abs(s.amount)} />
                  )
               }
            </Table.TD>
            <Table.TD kind='amount'>
               {
                  s.amount >= 0 && (
                     <Numeric amount={s.amount} />
                  )
               }
            </Table.TD>
         </>
      );
}

const amountColumnsNotes = (
   valueColumn: boolean,
) => {
   return valueColumn
      ? <Table.TD kind="amount" />
      : (
         <>
            <Table.TD kind="amount" />
            <Table.TD kind="amount" />
         </>
      );
}

/**
 * The column(s) to use for stock accounts
 */

const stockColumnsHeader = (
   account: Account | undefined, // set only when showing for a single account
) => {
   return account?.isStock()
      ? (
         <>
            <Table.TH kind="shares" sortable={true}>Shares</Table.TH>
            <Table.TH
               kind="amount"
               title="Price of one share at the time of the transaction"
               sortable={true}
            >
               Price
            </Table.TH>
            <Table.TH kind="shares" title="Balance of shares">SBalance</Table.TH>
         </>
      ) : null;
}

const stockColumns = (
   account: Account | undefined, // set only when showing for a single account
   t: Transaction|undefined,
   s: Split,
   force?: boolean,
) => {
   if (! account?.isStock()) {
      return null;
   }

   return (
      <>
         <Table.TD kind="shares">
             <Numeric
                amount={s.shares}
                precision={account?.sharesPrecision}
             />
         </Table.TD>
         <Table.TD kind="amount">
             <Numeric
                amount={s.price}
                precision={account?.pricePrecision}
             />
         </Table.TD>
         <Table.TD kind="shares">
            <Numeric
                amount={t?.balanceShares}
                precision={account?.sharesPrecision}
            />
         </Table.TD>
      </>
   );
}

/**
 * The first two for a transaction.
 * It will show either the single split associated with the transaction, or a
 * summary of all the splits.
 */

interface FirstRowProps {
   transaction: Transaction;
   accounts: Account[]|undefined;
   prefs: LedgerPrefs;
   expanded?: boolean;
}
const FirstRow: React.FC<FirstRowProps> = p => {
   const t = p.transaction;
   const sa = p.accounts ? splitsForAccounts(t, p.accounts) : undefined;
   let s: Split = {
      accountId: SPLIT_ID,
      account: undefined,
      reconcile: sa ? sa[0].reconcile : 'n',
      payee: sa?.filter(s => s.payee).reduce((a, s) => a + s.payee, ''),
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

   switch (p.prefs.split_mode) {
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

   return (
      <Table.TR>
         <Table.TD kind='date'>{t.date}</Table.TD>
         <Table.TD kind='num' className='numeric'>{s.checknum}</Table.TD>
         <Table.TD kind='payee'>
            <Link to={`/payee/${s.payee}`}>{s.payee}</Link>
         </Table.TD>
         <Table.TD kind='transfer'>
            {
               s.accountId === SPLIT_ID
               ? SPLIT
               : <AccountName
                    id={s.accountId}
                    account={s.account}
                    noLinkIf={p.accounts}
                 />
            }
         </Table.TD>
         {
            !p.prefs.hideReconcile &&
            <Table.TD kind='reconcile'>{s.reconcile}</Table.TD>
         }
         {
            amountColumns(s, p.prefs.valueColumn)
         }
         {
            stockColumns(
               p.accounts && p.accounts.length === 1 ? p.accounts[0] : undefined,
               t, s, true)
         }
         {
            !p.prefs.hideBalance &&
            <Table.TD kind='amount'>
               <Numeric amount={t.balance} />
            </Table.TD>
         }
      </Table.TR>
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
      <Table.TR>
         <Table.TD kind="date" />
         <Table.TD kind="num"></Table.TD>
         <Table.TD kind="notes">{p.transaction.memo}</Table.TD>
         <Table.TD kind="transfer" />
         {
            !p.prefs.hideReconcile &&
            <Table.TD kind="reconcile" />
         }
         {
            amountColumnsNotes(p.prefs.valueColumn)
         }
         {
            !p.prefs.hideBalance &&
            <Table.TD kind="amount" />
         }
      </Table.TR>
   );
}

/**
 * Split details
 */

interface SplitRowProps {
   split: Split;
   accounts: Account[]|undefined;
   prefs: LedgerPrefs;
}
const SplitRow: React.FC<SplitRowProps> = p => {
   const s = p.split;
   return (
      <Table.TR>
         <Table.TD kind='date' />
         <Table.TD kind='num' className='numeric'>{s.checknum}</Table.TD>
         <Table.TD kind='notes'>{`${s.memo || ''}${s.payee || ''}`}</Table.TD>
         <Table.TD kind='transfer'>
            <AccountName
               id={s.accountId}
               account={s.account}
               noLinkIf={p.accounts}
            />
         </Table.TD>
         {
            !p.prefs.hideReconcile &&
            <Table.TD kind='reconcile'>{s.reconcile}</Table.TD>
         }
         {
            amountColumns(s, p.prefs.valueColumn)
         }
         {
            stockColumns(
               p.accounts && p.accounts.length === 1 ? p.accounts[0] : undefined,
               undefined,
               s)
         }
         {
            !p.prefs.hideBalance &&
            <Table.TD kind='amount' />
         }
      </Table.TR>
   );
}

/**
 * One or more rows to describe a transaction
 */

interface TransactionRowProps {
   transaction: Transaction;
   accounts: Account[]|undefined;
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

   if (splitRowsCount(t, p.prefs.split_mode, p.expanded, p.accounts) > 0) {
      let filterSplits: undefined|Split[];

      switch (p.prefs.split_mode) {
         case SplitMode.SUMMARY:
            const amount =
                (p.accounts === undefined || p.accounts.length > 1)
                ? amountIncomeExpense(t)
                : amountForAccounts(t, p.accounts);
            if (t.splits.length > 2) {
               lines = (
                  <Table.TR partial={true}>
                     <Table.TD>
                        <Numeric amount={amount} />
                        &nbsp;=&nbsp;
                        {
                           t.splits.map((s, index) =>
                              (p.accounts === undefined
                                 || !s.account
                                 || !p.accounts.includes(s.account)
                              ) ? <span key={index}>
                                 <span>{ s.amount >= 0 ? ' - ' : ' + ' }</span>
                                 <Numeric amount={Math.abs(s.amount)} />
                                 (
                                    <AccountName
                                        id={s.accountId}
                                        account={s.account}
                                    />
                                 )
                              </span> : null
                           )
                        }
                     </Table.TD>
                  </Table.TR>
               );
            }
            break;
         case SplitMode.OTHERS:
            filterSplits = p.accounts === undefined
                ? t.splits
                : splitsNotForAccounts(t, p.accounts);
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
            prefs={p.prefs}
            accounts={p.accounts}
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
   account: Account;
}

export const EditingRow: React.FC<EditingRowProps> = p => {
   return (
      <div className="trgroup">
         <Table.TR editable={true} >
            <Table.TD kind='date'>
               <input type="date" placeholder="2020-07-01" tabIndex={1} />
            </Table.TD>
            <Table.TD kind='num'>
               <input placeholder="num" />
            </Table.TD>
            <Table.TD kind='payee'>
               <input placeholder="payee" tabIndex={2} />
            </Table.TD>
            <Table.TD kind='transfer' />
            <Table.TD kind='reconcile' />
            <Table.TD kind='amount' />
            <Table.TD kind='amount' />
            <Table.TD kind='amount'>
               <button className="fa fa-check" tabIndex={13} />
            </Table.TD>
         </Table.TR>
         <Table.TR editable={true} >
            <Table.TD kind='date' />
            <Table.TD kind='num'>
               <input placeholder="action" tabIndex={3} />
            </Table.TD>
            <Table.TD kind='payee'>
               <input placeholder="notes" tabIndex={4} />
            </Table.TD>
            <Table.TD kind='transfer'>
               <AccountName
                  id={p.accountId}
                  account={p.account}
                  noLinkIf={[p.account]}
               />
            </Table.TD>
            <Table.TD kind='reconcile'>
               <select>
                  <option>n</option>
                  <option>C</option>
                  <option>R</option>
               </select>
            </Table.TD>
            <Table.TD kind='amount'>
               <input
                  type="numeric"
                  placeholder="0.00"
                  tabIndex={6}
                  style={{textAlign: 'right'}}
               />
            </Table.TD>
            <Table.TD kind='amount'>
               <input
                  type="numeric"
                  placeholder="0.00"
                  tabIndex={7}
                  style={{textAlign: 'right'}}
               />
            </Table.TD>
            <Table.TD kind='amount'>
               <button className="fa fa-ban" />
            </Table.TD>
         </Table.TR>
         <Table.TR editable={true} >
            <Table.TD kind='date' />
            <Table.TD kind='num'>
               <input placeholder="action" tabIndex={8} />
            </Table.TD>
            <Table.TD kind='payee'>
               <input placeholder="notes" tabIndex={9} />
            </Table.TD>
            <Table.TD kind='transfer'>
               <input placeholder="transfer to/from" tabIndex={10} />
            </Table.TD>
            <Table.TD kind='reconcile' />
            <Table.TD kind='amount'>
               <input
                  type="numeric"
                  placeholder="0.00"
                  tabIndex={11}
                  style={{textAlign: 'right'}}
               />
            </Table.TD>
            <Table.TD kind='amount'>
               <input
                  type="numeric"
                  placeholder="0.00"
                  tabIndex={12}
                  style={{textAlign: 'right'}}
               />
            </Table.TD>
            <Table.TD kind='amount' />
            </Table.TR>
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
   accounts: Account[]|undefined,
) => {
   const r: RowStateProps = {};

   transactions.forEach(t => {
      const rows =
         splitRowsCount(t, split_mode, true, accounts)
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
   accounts: Account[] | undefined;  // undefined for all accounts
   range?: DateRange|undefined   // undefined, to see forever
   transactions: Transaction[];  // as downloaded from server, and after
      // resolving Account fields
}

const Ledger: React.FC<LedgerProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const [ rowState, setRowState ] = React.useState<RowStateProps>({});
   const list = React.useRef<VariableSizeList>(null);

   React.useEffect(
      () => {
         const name = p.accounts === undefined
            ? 'All accounts'
            : p.accounts.length === 1
            ? p.accounts[0]?.name
            : 'Multiple accounts';
         const dates = p.range ? rangeDisplay(p.range) : '';
         setHeader?.(`${name} ${dates}`);
      },
      [p.accounts, setHeader, p.range]
   );

   const resetAfterIndex = React.useCallback(
      (index: number) => {
         if (list.current) {
            list.current!.resetAfterIndex(index);
         }
      },
      []
   );

   React.useLayoutEffect(
      () => {
         setRowState(setupLogicalRows(
            p.transactions,
            p.trans_mode, p.split_mode,
            p.defaultExpand,
            p.accounts));
         resetAfterIndex(0);
      },
      [p.transactions, p.accounts, p.split_mode, p.trans_mode, p.defaultExpand,
       resetAfterIndex]
   );

   const setTransactionExpanded = React.useCallback(
      (tr: Transaction, expanded: boolean) => {
         resetAfterIndex(0);
         setRowState(old => ({
               ...old,
               [tr.id]: {expanded},
         }));
      },
      [resetAfterIndex]
   );

   const [future, present, reconciled, cleared, selected] = React.useMemo(
      () => {
         const future = p.transactions[p.transactions.length - 1]?.balance;
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

         for (let j = p.transactions.length - 1; j >= 0; j--) {
            const t = p.transactions[j];
            if (present === undefined && t.date <= formatted) {
               present = t.balance;
            }
            if (p.accounts === undefined) {
               t.splits.forEach(addSplit);
            } else {
               splitsForAccounts(t, p.accounts).forEach(addSplit);
            }
         }

         return [future, present, reconciled, cleared, selected];
      },
      [p.transactions, p.accounts]
   );

   const Row =
      (r: ListChildComponentProps) => {
         const t = p.transactions[r.index];
         delete r.style['width'];   // set in the CSS
         return (
            <TransactionRow
               style={r.style}
               transaction={t}
               accounts={p.accounts}
               prefs={p}
               expanded={rowState[t.id]?.expanded}
               setExpanded={setTransactionExpanded}
            />
         );
      }

   const getTransactionHeight = React.useCallback(
      (index: number) => {
         const t = p.transactions[index];
         const d = rowState[t?.id];
         return Table.ROW_HEIGHT * (
            1
            + noteRowsCount(t, p.trans_mode, d?.expanded)
            + splitRowsCount(t, p.split_mode, d?.expanded, p.accounts));
      },
      [rowState, p.transactions, p.trans_mode, p.accounts, p.split_mode]
   );

   const getTransactionKey = (index: number) => {
      return p.transactions[index].id;
   }

   const header = (
      <Table.TR>
         <Table.TH kind='date' sortable={true}>Date</Table.TH>
         <Table.TH kind='num' className="numeric" sortable={true}>Num</Table.TH>
         <Table.TH kind='payee' sortable={true}>Payee/Memos</Table.TH>
         <Table.TH kind='transfer' sortable={true}>From/To</Table.TH>
         {
            !p.hideReconcile &&
            <Table.TH kind='reconcile'>R</Table.TH>
         }
         {
            amountColumnsHeaders(p.valueColumn)
         }
         {
            stockColumnsHeader(
               p.accounts !== undefined && p.accounts.length === 1
               ? p.accounts[0]
               : undefined
            )
         }
         {
            !p.hideBalance &&
            <Table.TH kind='amount' >Balance</Table.TH>
         }
      </Table.TR>
   );

   const footer = (
      <Table.TR partial={true}>
         {
            selected !== undefined &&
            <Table.TD>
               selected:
               <Numeric amount={selected} />
            </Table.TD>
         }
         {
            reconciled  // also omit when 0
            ? (
               <Table.TD>
                  reconciled:
                  <Numeric amount={reconciled} />
               </Table.TD>
            ) : null
         }
         {
            cleared  // also omit when 0
            ? (
               <Table.TD>
                  cleared:
                  <Numeric amount={cleared} />
               </Table.TD>
            ) : null
         }
         {
            present !== undefined &&
            <Table.TD>
               present:
               <Numeric amount={present} />
            </Table.TD>
         }
         {
            future !== undefined &&
            future !== present &&
            <Table.TD>
               future:
               <Numeric amount={future} />
            </Table.TD>
         }
      </Table.TR>
   );

   return (
      <div className="ledger" >
         <Table.Table
            borders={p.borders}
            background={
               p.trans_mode !== TransactionMode.ONE_LINE
               || p.split_mode !== SplitMode.HIDE
            }
            expandableRows={p.split_mode !== SplitMode.HIDE}
            header={header}
            footer={footer}
            itemCount={p.transactions.length}
            itemSize={getTransactionHeight}
            itemKey={getTransactionKey}
            getRow={Row}
            ref={list}
         />

         {/*
            p.accountIds && p.accountIds.length === 1 &&
            <EditingRow accountId={p.accountIds[0] as AccountId} />
            */
         }
      </div>
   );
}

export interface LedgerPanelProps extends LedgerPrefs {
   accountIds: AccountId[] | undefined;  // undefined for all accounts
   range?: DateRange|undefined   // undefined, to see forever
}
export const LedgerPanel: React.FC<LedgerPanelProps> = p => {
   const accounts = useAccountIds(p.accountIds);
   const transactions = useTransactions(p.accountIds, p.range);
   return (
      <Ledger {...p} accounts={accounts} transactions={transactions} />
   );
}

interface LedgerPageProps {
   setHeader: (title: string|undefined) => void;
}
export const LedgerPage: React.FC<LedgerPageProps> = p => {
   const { accountId } = useParams();
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const { pushAccount } = useHistory();

   const account = accounts.getAccount(accountId);
   const transactions = useTransactions([accountId]);

   React.useEffect(
      () => pushAccount(accountId),
      [accountId, pushAccount]
   );

   if (!account) {
      return <div>Unknown account</div>;
   }

   return (
      <div className="main-area" >
         {
            account?.isStock() &&
            <Panel header="Price history">
               <PriceHistory
                  account={account}
                  transactions={transactions}
               />
            </Panel>
         }
         <Panel className="ledger">
            <Ledger
               setHeader={p.setHeader}
               accounts={[account]}
               transactions={transactions}
               hideBalance={false}
               {...prefs.ledgers}
            />
         </Panel>
      </div>
   );
}

export default React.memo(Ledger);
