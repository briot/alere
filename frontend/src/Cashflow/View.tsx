import * as React from 'react';
import { DateRange, monthCount, rangeDisplay } from '@/Dates';
import { Link } from 'react-router-dom';
import Numeric from '@/Numeric';
import Table from '@/List';
import usePrefs from '@/services/usePrefs';
import usePL from '@/services/usePL';
import './Cashflow.scss';

export interface CashflowProps {
   range: DateRange;
   roundValues?: boolean;
}

const Cashflow: React.FC<CashflowProps> = p => {
   const { prefs } = usePrefs();
   const currency = prefs.currencyId;
   const pl = usePL(p.range, currency);
   const months = monthCount(p.range);
   const networth_delta = pl.networth - pl.networth_start;
   const cashflow = pl.income - pl.expenses;
   const unrealized = networth_delta - cashflow;

   const flowrow = (r: {
      head: string,
      amount: number,
      tooltip?: string,
      bold?: boolean,
      border?: boolean,
      padding?: number,
      url?: string,
   }) => (
      <Table.TR
         tooltip={r.tooltip}
         style={{borderTop: r.border ? "1px solid var(--table-border)" : ""}}
      >
        {r.bold ? (
           <>
              <Table.TH>{r.head}</Table.TH>
              <Table.TH className="amount">
                 <Numeric
                    amount={r.amount}
                    commodity={currency}
                    scale={p.roundValues ? 0 : undefined}
                 />
              </Table.TH>
              <Table.TH className="amount">
                 <Numeric
                    amount={r.amount / months}
                    commodity={currency}
                    scale={p.roundValues ? 0 : undefined}
                 />
              </Table.TH>
           </>
        ) : (
           <>
              <Table.TD
                 style={{paddingLeft: (r.padding ?? 0) * 20}}
              >
                 {
                    r.url
                    ? <Link to={r.url}>{r.head}</Link>
                    : r.head
                  }
              </Table.TD>
              <Table.TD className="amount">
                 <Numeric
                    amount={r.amount}
                    commodity={currency}
                    scale={p.roundValues ? 0 : undefined}
                 />
              </Table.TD>
              <Table.TD className="amount">
                 <Numeric
                    amount={r.amount / months}
                    commodity={currency}
                    scale={p.roundValues ? 0 : undefined}
                 />
              </Table.TD>
           </>
         )}
      </Table.TR>
   );

   return (
      <div className="cashflow">
         <div className='table' style={{height: 'auto'}}>
            <div className="thead">
               <Table.TR>
                 <Table.TH />
                 <Table.TH className="amount">
                    {rangeDisplay(p.range).text}
                 </Table.TH>
                 <Table.TH className="amount">/ month</Table.TH>
               </Table.TR>
            </div>
            <div className="tbody">
               {
                  flowrow({
                     head: 'Total income',
                     amount: pl.income,
                     tooltip: "Cumulated income (passive + from work)",
                     bold:  true})
               }
               {
                  pl.work_income !== 0 &&
                  flowrow({
                     head: '  Income from work',
                     amount: pl.work_income,
                     tooltip: "Sum of all income from work"
                       + " (salaries, unemployment,...) during that period",
                     padding: 1,
                     url: `/ledger?accounts=work_income&range=${p.range}`,
                  })
               }
               {
                  pl.passive_income !== 0 &&
                  flowrow({
                     head: '  Passive income',
                     amount: pl.passive_income,
                     tooltip: "Income that would remain if you stopped working"
                      + " (dividends, rents,...)",
                     padding: 1,
                     url: `/ledger?accounts=passive_income&range=${p.range}`,
                  })
               }
               {
                  pl.income - pl.work_income - pl.passive_income !== 0 &&
                  flowrow({
                     head: '  Other income',
                     amount: pl.income - pl.work_income - pl.passive_income,
                     tooltip: "Unclassified income",
                     padding: 1,
                     url: `/ledger?accounts=other_income&range=${p.range}`,
                  })
               }
               {
                  flowrow({
                     head: 'Total expenses',
                     amount: -pl.expenses,
                     tooltip: "Sum of all expenses during that period",
                     bold: true,
                     url: `/ledger?accounts=expenses&range=${p.range}`,
                  })
               }
               {
                  pl.income_taxes !== 0 &&
                  flowrow({
                     head: 'Income taxes',
                     amount: -pl.income_taxes,
                     padding: 1,
                     url: `/ledger?accounts=income_taxes&range=${p.range}`,
                  })
               }
               {
                  pl.other_taxes !== 0 &&
                  flowrow({
                     head: 'Other taxes',
                     amount: -pl.other_taxes,
                     padding: 1,
                     url: `/ledger?accounts=other_taxes&range=${p.range}`,
                  })
               }
               {
                  -pl.expenses + pl.income_taxes + pl.other_taxes !== 0 &&
                  flowrow({
                     head: 'Other expenses',
                     amount: -pl.expenses + pl.income_taxes + pl.other_taxes,
                     padding: 1,
                  })
               }
               {
                  flowrow({
                     head: 'Cashflow',
                     amount: cashflow,
                     tooltip: "Income minus expenses, not counting the delta in the valuation of stocks",
                     bold: true,
                     border: true,
                  })
               }
               {
                  unrealized !== 0 &&
                  flowrow({
                     head: 'Unrealized gains',
                     amount: unrealized,
                     tooltip: "Variation in the price of your investments",
                     bold: true,
                     padding: 1,
                  })
               }
               {
                  flowrow({
                     head: 'Net worth change',
                     amount: networth_delta,
                     tooltip: "How much your total networth change during that period",
                     bold: true,
                     border: true,
                  })
               }
            </div>
         </div>
      </div>
   );
}
export default Cashflow;
