import React from 'react';
import { Transaction } from 'Transaction';
import Numeric from 'Numeric';
import './Ledger.css';

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
       : p.expanded ? 'expandable'
       : 'expandable expanded';
   const detClass = p.details ? 'details' : '';
   const className = `tr ${p.partial ? 'right-aligned' : ''} ${expClass} ${detClass}`;
   return (
      <div className={className} >
         {p.children}
      </div>
   );
}

/**
 * One or more rows to describe a transaction
 */

const TransactionRow: React.FC<Transaction> = p => {
   if (p.splits.length === 1) {
      const s = p.splits[0];
      return (
         <TR>
            <TD kind='date'>{p.date}</TD>
            <TD kind='num'>{s.num}</TD>
            <TD kind='payee'>{p.payee}</TD>
            <TD kind='transfer'>{s.account}</TD>
            <TD kind='reconcile'>{s.reconcile}</TD>
            <TD kind='amount'>
               {
                  s.amount < 0 && (
                     <Numeric amount={s.amount} />
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
               <Numeric amount={p.balance} />
            </TD>
         </TR>
      );

   } else {
      return (
         <>
            <TR expanded={true}>
               <TD kind='date'>{p.date}</TD>
               <TD kind='num' />
               <TD kind='payee'>{p.payee}</TD>
               <TD kind='transfer'>--split--</TD>
               <TD kind='reconcile' />
               <TD kind='amount' />
               <TD kind='amount' />
               <TD kind='amount'>
                  <Numeric amount={p.balance} />
               </TD>
            </TR>

            {
               p.splits.map((s, sid) => (
                  <TR details={true} key={`${p.id} ${sid}`} >
                     <TD kind='date' />
                     <TD kind='num'>{s.num}</TD>
                     <TD kind='payee' />
                     <TD kind='transfer'>{s.account}</TD>
                     <TD kind='reconcile'>{s.reconcile}</TD>
                     <TD kind='amount'>
                        {
                           s.amount < 0 && (
                              <Numeric amount={s.amount} />
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
               ))
            }
         </>
      );
   }
}

interface LedgerProps {
   transactions: Transaction[];
}

const Ledger: React.FC<LedgerProps> = p => {
   return (
      <div id='main' className='ledger'>
         <div className="thead">
            <TR>
               <TH kind='date' sortable={true}>Date</TH>
               <TH kind='num' sortable={true}>Num</TH>
               <TH kind='payee' sortable={true}>Payee</TH>
               <TH kind='transfer' sortable={true}>From/To</TH>
               <TH kind='reconcile'>R</TH>
               <TH kind='amount' sortable={true} asc={false}>Payment</TH>
               <TH kind='amount' sortable={true} asc={true}>Deposit</TH>
               <TH kind='amount' >Balance</TH>
               <div className="scrollbar-width"></div>
            </TR>
         </div>

         <div className="tbody">
            {
               p.transactions.map(t => (
                  <TransactionRow key={t.id} {...t} />
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
