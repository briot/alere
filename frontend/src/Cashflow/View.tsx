import * as React from 'react';
import { DateRange, monthCount, rangeDisplay } from '@/Dates';
import { Link } from 'react-router-dom';
import Tooltip from '@/Tooltip';
import Numeric from '@/Numeric';
import Table from '@/List';
import usePrefs from '@/services/usePrefs';
import { usePLMultiple, Metric } from '@/services/usePL';
import { CommodityId } from '@/services/useAccounts';
import './Cashflow.scss';

export interface CashflowProps {
   ranges: DateRange[];
   roundValues?: boolean;
}

interface PL_Result {
   range: DateRange;
   pl: Metric;
   months: number;
   unrealized: number;
   cashflow: number;
   networth_delta: number;
}

const Flowrow = (r: {
   pls: PL_Result[],
   head: string,
   amount: (pl: PL_Result) => number,
   currency: CommodityId;
   roundValues: boolean|undefined,
   tooltip?: string,
   bold?: boolean,
   border?: boolean,
   padding?: number,
   marginTop?: number,
   url?: (range: DateRange) => string,
}) => {
   const Cell = r.bold ? Table.TH : Table.TD;
   const lastpl = r.pls[r.pls.length - 1];
   return (
      <Table.TR
         tooltip={r.tooltip}
         style={{
            borderTop: r.border ? "1px solid var(--table-border)" : "",
            marginTop: (r.marginTop ?? 0) + 'px',
         }}
      >
         {
            r.bold ? (
               <Table.TH>{r.head}</Table.TH>
            ) : (
               <Table.TD style={{paddingLeft: (r.padding ?? 0) * 20}} >
                  {r.head}
               </Table.TD>
            )
         }
         {
            r.pls.map((pl, index) => {
               const amount = r.amount(pl);
               const url = r.url?.(pl.range);
               return (
                  <Cell className="amount" key={index}>
                     {
                        url ? (
                           <Link to={url} >
                              <Numeric
                                 amount={amount}
                                 commodity={r.currency}
                                 scale={r.roundValues ? 0 : undefined}
                              />
                           </Link>
                        ) : (
                           <Numeric
                              amount={amount}
                              commodity={r.currency}
                              scale={r.roundValues ? 0 : undefined}
                           />
                        )
                     }
                  </Cell>
               );
            })
         }
         <Cell className="amount">
            <Numeric
               amount={r.amount(lastpl) / lastpl.months}
               commodity={r.currency}
               scale={r.roundValues ? 0 : undefined}
            />
         </Cell>
      </Table.TR>
   );
};


const Cashflow: React.FC<CashflowProps> = p => {
   const { prefs } = usePrefs();
   const currency = prefs.currencyId;
   const pl_raw = usePLMultiple(p.ranges, currency);
   const pls = pl_raw.map((pl, index) => {
      const cashflow = pl.income - pl.expenses;
      const networth_delta = pl.networth - pl.networth_start;
      const range = p.ranges[index];
      return {
         range,
         pl,
         months: monthCount(range),
         unrealized: networth_delta - cashflow,
         cashflow,
         networth_delta,
      };
   });

   return (
      <div className="cashflow">
         <div className='table' style={{height: 'auto'}}>
            <div className="thead">
               <Table.TR>
                 <Table.TH />
                 {
                    p.ranges.map((r, index) => {
                       const d = rangeDisplay(r);
                       return (
                          <Table.TH className="amount" key={index}>
                             <Tooltip tooltip={d.as_dates}>
                                <span>{d.text}</span>
                             </Tooltip>
                          </Table.TH>
                       );
                    })
                 }
                 <Table.TH className="amount">/ month</Table.TH>
               </Table.TR>
            </div>
            <div className="tbody">
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='Total income'
                  amount={v => v.pl.income}
                  tooltip="Cumulated income (passive + from work)"
                  bold={true}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='  Income from work'
                  amount={v => v.pl.work_income}
                  tooltip="Sum of all income from work (salaries, unemployment,...) during that period"
                  padding={1}
                  url={r => `/ledger?accounts=work_income&range=${r}`}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='  Passive income'
                  amount={v => v.pl.passive_income}
                  tooltip="Income that would remain if you stopped working (dividends, rents,...)"
                  padding={1}
                  url={r => `/ledger?accounts=passive_income&range=${r}`}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='  Other income'
                  amount={v => v.pl.income - v.pl.work_income
                               - v.pl.passive_income}
                  tooltip="Unclassified income"
                  padding={1}
                  url={r => `/ledger?accounts=other_income&range=${r}`}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='Total expenses'
                  amount={v => -v.pl.expenses}
                  tooltip="Sum of all expenses during that period"
                  bold={true}
                  url={r => `/ledger?accounts=expenses&range=${r}`}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='Income taxes'
                  amount={v => -v.pl.income_taxes}
                  padding={1}
                  url={r => `/ledger?accounts=income_taxes&range=${r}`}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='Other taxes'
                  amount={v => -v.pl.other_taxes}
                  padding={1}
                  url={r => `/ledger?accounts=other_taxes&range=${r}`}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head={'Other expenses'}
                  amount={v => -v.pl.expenses + v.pl.income_taxes
                               + v.pl.other_taxes}
                  padding={1}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='Cashflow'
                  amount={v => v.cashflow}
                  tooltip="Income minus expenses, not counting the delta in the valuation of stocks"
                  bold={true}
                  border={true}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='Unrealized gains'
                  amount={v => v.unrealized}
                  tooltip="Variation in the price of your investments"
                  bold={true}
                  padding={1}
                  marginTop={10}
               />
               <Flowrow
                  pls={pls}
                  currency={currency}
                  roundValues={p.roundValues}
                  head='Net worth change'
                  amount={v => v.networth_delta}
                  tooltip="How much your total networth change during that period"
                  bold={true}
                  border={true}
               />
            </div>
         </div>
      </div>
   );
}
export default Cashflow;
