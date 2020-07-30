import React from 'react';
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

const SPLIT = '--split--';
const SPLIT_ID = -1;

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
   level?: number;
   editable?: boolean;
}
const TR: React.FC<TRProps> = p => {
   const levClass = !p.level ? 'first' : 'details';
   const editClass = p.editable ? 'edit' : '';
   const className = `tr ${p.partial ? 'right-aligned' : ''} ${editClass} ${levClass}`;
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
            const s2 = firstSplitForAccount(t, p.accountId);
            s = {...s2, amount: s.amount};
         }
         break;
      case SplitMode.MULTILINE:
         break;
   }

   return (
      <TR expanded={p.expanded}>
         <TD kind='date'>{t.date}</TD>
         <TD kind='num'>{s.num}</TD>
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
   accountId: AccountId;
   accounts: AccountList;
}
const SplitRow: React.FC<SplitRowProps> = p => {
   const s = p.split;
   return (
      <TR level={1}>
         <TD kind='date' />
         <TD kind='num'>{s.num}</TD>
         <TD kind='payee' />
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
}

const TransactionRow: React.FC<TransactionRowProps> = p => {
   const t = p.transaction;

   // undefined if not expandable
   const [expanded, setExpanded] = React.useState<undefined|boolean>(
      () => {
         switch (p.options.split_mode) {
            case SplitMode.COLLAPSED:
            case SplitMode.SUMMARY:
               return t.splits.length > 2 ? true : undefined;
            case SplitMode.MULTILINE:
               return true;
         }
      }
   );

   const onExpand = React.useCallback(
      () => {
         setExpanded(old => !old);
      },
      []
   );

   let lines: (JSX.Element|null)[] = [];

   const expClass = 'trgroup ' + (
       expanded === undefined ? ''
       : expanded ? 'expandable expanded'
       : 'expandable collapsed'
   );

   switch (p.options.split_mode) {
      case SplitMode.COLLAPSED:
         if (t.splits.length > 2) {
            lines = t.splits.map((s, sid) => (
               <SplitRow
                  key={`${t.id} ${sid}`}
                  split={s}
                  accountId={p.accountId}
                  accounts={p.accounts}
               />
            ));
         }
         break;

      case SplitMode.MULTILINE:
         lines = t.splits.map((s, sid) => (
            <SplitRow
               key={`${t.id} ${sid}`}
               split={s}
               accountId={p.accountId}
               accounts={p.accounts}
            />
         ));
         break;

      case SplitMode.SUMMARY:
         const amount = amountForAccount(t, p.accountId);
         if (t.splits.length > 2) {
            lines = [
               <TR partial={true} level={1}>
                  <TD>
                     <Numeric amount={amount} />
                     &nbsp;=&nbsp;
                     {
                        t.splits.map(s =>
                           (s.account !== p.accountId)
                           ? [
                              <span>{ s.amount >= 0 ? ' - ' : ' + ' }</span>,
                              <Numeric amount={Math.abs(s.amount)} />,
                              ' (',
                              <a href='#a'>{p.accounts.name(s.account)}</a>,
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
      <div className={expClass} onClick={onExpand} >
         <FirstRow
            transaction={t}
            options={p.options}
            accountId={p.accountId}
            accounts={p.accounts}
            expanded={expanded}
          />
         <NotesRow transaction={t} options={p.options} />
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
 * The full ledger
 */

interface LedgerProps {
   accountId: AccountId;
   transactions: Transaction[];
   options: LedgerOptions;
}

const Ledger: React.FC<LedgerProps> = p => {
   const { accounts } = useAccounts();
   const account = accounts.get_account(p.accountId);

   window.console.log('Render ledger', account, p.transactions);

   if (!account) {
      return <div>Loading...</div>
   }

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
            </TR>
         </div>

         <div className="tbody">
            {
               p.transactions.map(t => (
                  <TransactionRow
                     key={t.id}
                     transaction={t}
                     accountId={p.accountId}
                     accounts={accounts}
                     options={p.options}
                  />
               ))
            }
            <EditingRow accountId={p.accountId} accounts={accounts} />
         </div>

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
