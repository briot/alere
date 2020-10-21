import * as React from 'react';
import { DateRange, monthCount, rangeToHttp } from 'Dates';
import { Commodity, CommodityId } from 'services/useAccounts';
import { Link } from 'react-router-dom';
import Numeric from 'Numeric';
import Table from 'List';
import usePrefs from 'services/usePrefs';
import './Cashflow.css';

const commMonths: Commodity = {
   id: -2,
   name: "month",
   symbol_before: '',
   symbol_after: 'months',
   qty_scale: 1,
   is_currency: false,
}

interface Metric {
   income: number;
   passive_income: number;
   work_income: number;
   expenses: number;
   income_taxes: number;
   other_taxes: number;
   networth: number;
   networth_start: number;
   liquid_assets: number;
}

const useFetchPL = (range: DateRange, currencyId: CommodityId) => {
   const [data, setData] = React.useState<Metric>({
      income: NaN,
      passive_income: NaN,
      expenses: NaN,
      work_income: NaN,
      networth: NaN,
      networth_start: NaN,
      liquid_assets: NaN,
      income_taxes: NaN,
      other_taxes: NaN,
   });

   React.useEffect(
      () => {
         const doFetch = async() => {
            const resp = await window.fetch(
               `/api/metrics?${rangeToHttp(range)}&currency=${currencyId}`);
            const d: Metric = await resp.json();
            setData(d);
         }
         doFetch();
      },
      [range, currencyId]
   );

   return data;
}

interface MetricsProps {
   name: string;
   descr: string;
   value: number | React.ReactNode;
   ideal?: number;
   compare?: string;
   commodity?: CommodityId|Commodity;
   suffix?: string;
   tooltip?: string;
}

const Metrics: React.FC<MetricsProps> = p => {
   if (p.value === null || p.value === undefined ||
       (isNaN(p.value as any) && !React.isValidElement(p.value))
   ) {
      return null;
   }

   return (
      <div className="metrics">
         <h5>{p.name}</h5>
            <p className="descr">{p.descr}</p>
         <div className="values" >
            {
               p.ideal !== undefined && !isNaN(p.ideal)  &&
               <span className="recommended">
                  (recommended {p.compare}
                     <Numeric
                        amount={p.ideal}
                        commodity={p.commodity}
                        suffix={p.suffix}
                     />
                  )
               </span>
            }
            {
               React.isValidElement(p.value)
               ? (
               <span className="value" title={p.tooltip}>
                  {p.value}
               </span>
               )
               : (
               <span className="value" title={p.tooltip}>
                  <Numeric
                     amount={p.value as number}
                     commodity={p.commodity}
                     suffix={p.suffix}
                  />
               </span>
               )
            }
         </div>
      </div>
   );
}


export interface CashflowProps {
   range: DateRange;
}

const Cashflow: React.FC<CashflowProps> = p => {
   const { prefs } = usePrefs();
   const currency = prefs.currencyId;
   const pl = useFetchPL(p.range, currency);
   const months = monthCount(p.range);
   const monthly_expenses = pl.expenses / months;
   const networth_delta = pl.networth - pl.networth_start;
   const cashflow = pl.income - pl.expenses;

   const non_work_income =
      //  pl.passive_income
      networth_delta + pl.expenses - pl.work_income;

   const flowrow = (p: {
      head: string,
      amount: number,
      title?: string,
      bold?: boolean,
      border?: boolean,
      padding?: number,
      url?: string,
   }) => (
      <Table.TR
         title={p.title}
         style={{borderTop: p.border ? "1px solid var(--table-color)" : ""}}
      >
        {p.bold ? (
           <>
              <Table.TH>{p.head}</Table.TH>
              <Table.TH className="amount">
                 <Numeric amount={p.amount} commodity={currency} />
              </Table.TH>
              <Table.TH className="amount">
                 <Numeric amount={p.amount / months} commodity={currency} />
              </Table.TH>
           </>
        ) : (
           <>
              <Table.TD
                 style={{paddingLeft: (p.padding ?? 0) * 20}}
              >
                 {
                    p.url
                    ? <Link to={p.url}>{p.head}</Link>
                    : p.head
                  }
              </Table.TD>
              <Table.TD className="amount">
                 <Numeric amount={p.amount} commodity={currency} />
              </Table.TD>
              <Table.TD className="amount">
                 <Numeric amount={p.amount / months} commodity={currency} />
              </Table.TD>
           </>
         )}
      </Table.TR>
   );

   const assetrow = (p: {
      head: string,
      amount: number,
      title?: string,
      bold?: boolean,
      padding?: number
   }) => (
      <Table.TR
         title={p.title}
      >
         {p.bold ? (
            <>
               <Table.TH>
                  {p.head}
               </Table.TH>
               <Table.TH className="amount">
                  <Numeric amount={p.amount} commodity={currency} />
               </Table.TH>
            </>
         ): (
            <>
               <Table.TD
                  style={{paddingLeft: (p.padding ?? 0) * 20}}
               >
                  {p.head}
               </Table.TD>
               <Table.TD className="amount">
                  <Numeric amount={p.amount} commodity={currency} />
               </Table.TD>
            </>
         )}
      </Table.TR>
   );

   return (
      <div className="cashflow">
         <h3>Security</h3>

         {/* thepoorswiss.com/11-best-personal-finance-metrics/ */}
         <Metrics
            name="Savings rate"
            descr="How much of your income you are saving (not including how much the stock prices have changed)"
            value={cashflow / pl.income * 100}
            tooltip={`cashflow ${cashflow.toFixed(0)} / income ${pl.income.toFixed(0)}`}
            ideal={24}
            compare=">"
            suffix="%"
         />
         {/* www.doughroller.net/personal-finance/3-step-financial-checkup/ */}
         <Metrics
            name="Emergency Fund Ratio"
            descr="How many months worth of expenses can be funded through liquid assets, including investments and stocks"
            value={pl.liquid_assets / monthly_expenses}
            tooltip={`liquid assets ${pl.liquid_assets.toFixed(0)} / monthly expenses ${monthly_expenses.toFixed(0)}`}
            ideal={4}
            compare=">"
            commodity={commMonths}
         />
         <Metrics
            name="Actual income tax rate"
            descr="How much of your income you spend on taxes. This only includes income taxes, not other taxes"
            value={pl.income_taxes / pl.income * 100}
            tooltip={`Income taxes ${pl.income_taxes.toFixed(0)} / Total income ${pl.income.toFixed(0)}`}
            ideal={10}
            compare="<"
            suffix="%"
         />

         <h3>Comfort</h3>

         <Metrics
            name="Wealth"
            descr="How many months worth of expenses you own, total"
            value={pl.networth / monthly_expenses}
            tooltip={`Networth ${pl.networth.toFixed(0)} / Monthly expenses ${monthly_expenses.toFixed(0)}`}
            ideal={6}
            compare=">"
            commodity={commMonths}
         />
         <Metrics
            name="Return on Investment"
            descr="How much passive income your whole networth provides"
            value={non_work_income / pl.networth * 100}
            tooltip={`Passive income ${non_work_income.toFixed(0)} / Networth ${pl.networth.toFixed(0)}`}
            ideal={4}
            compare=">"
            suffix="%"
         />
         <Metrics
            name="Return on Investment for liquid assets"
            descr="How much passive income your liquid assets provides"
            value={non_work_income / pl.liquid_assets * 100}
            tooltip={`Passive income ${non_work_income.toFixed(0)} / Liquid assets ${pl.liquid_assets.toFixed(0)}`}
            ideal={4}
            compare=">"
            suffix="%"
         />
         <Metrics
            name="Housing expenses"
            descr="How much you spend on housing, including rent, electricity, gaz, home improvements,..."
            value={NaN}
            ideal={33}
            compare="<"
            suffix="%"
         />

         <h3>Wealth</h3>

         <Metrics
            name="Financial independence"
            descr="Part of your expenses covered by passive income (dividends, rents,...)"
            value={non_work_income / pl.expenses * 100}
            tooltip={`Passive income ${non_work_income.toFixed(0)} / Expenses ${pl.expenses.toFixed(0)}`}
            ideal={100}
            compare=">"
            suffix="%"
         />
         <Metrics
            name="Passive income"
            descr="What part of the total income comes from sources other than the result of our work (salary,...)"
            value={non_work_income / pl.income * 100}
            tooltip={`Passive income ${non_work_income.toFixed(0)} / Total Income ${pl.income.toFixed(0)}`}
            ideal={50}
            compare=">"
            suffix="%"
         />
         <Metrics
            name="Cashflow minus savings"
            descr="What part of the cashflow you invest (vs let it sleep in savings and checkings accounts)"
            value={NaN}
            ideal={0}
            compare="="
            commodity={currency}
         />

         <h3>Cashflow</h3>

         <div className='table' style={{height: 'auto'}}>
            <div className="thead">
               <Table.TR>
                 <Table.TH />
                 <Table.TH className="amount">Period</Table.TH>
                 <Table.TH className="amount">/ month</Table.TH>
               </Table.TR>
            </div>
            <div className="tbody">
               {
                  flowrow({
                     head: 'Total income',
                     amount: pl.income,
                     title: "Cumulated income (passive + from work)",
                     bold:  true})
               }
               {
                  flowrow({
                     head: '  Income from work',
                     amount: pl.work_income,
                     title: "Sum of all income from work"
                       + " (salaries, unemployment,...) during that period",
                     padding: 1,
                     url: `/ledger/work_income?range=${p.range}`,
                  })
               }
               {
                  flowrow({
                     head: '  Passive income',
                     amount: pl.passive_income,
                     title: "Income that would remain if you stopped working"
                      + " (dividends, rents,...)",
                     padding: 1,
                     url: `/ledger/passive_income?range=${p.range}`,
                  })
               }
               {
                  flowrow({
                     head: 'Total expenses',
                     amount: -pl.expenses,
                     title: "Sum of all expenses during that period",
                     bold: true,
                     url: `/ledger/expenses?range=${p.range}`,
                  })
               }
               {
                  flowrow({
                     head: 'Income taxes',
                     amount: -pl.income_taxes,
                     padding: 1,
                     url: `/ledger/income_taxes?range=${p.range}`,
                  })
               }
               {
                  flowrow({
                     head: 'Other taxes',
                     amount: -pl.other_taxes,
                     padding: 1,
                     url: `/ledger/other_taxes?range=${p.range}`,
                  })
               }
               {
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
                     title: "Income minus expenses, not counting the delta in the valuation of stocks",
                     bold: true,
                     border: true,
                  })
               }
               {
                  flowrow({
                     head: 'Unrealized gains',
                     amount: networth_delta - cashflow,
                     title: "Variation in the price of your investments",
                     padding: 1,
                  })
               }
               {
                  flowrow({
                     head: 'Networth change',
                     amount: networth_delta,
                     title: "How much your total networth change during that period",
                     bold: true,
                     border: true,
                  })
               }
            </div>
         </div>

         <h3>Assets</h3>

         <div className='table' style={{height: 'auto'}}>
            <div className="thead">
               <Table.TR>
                 <Table.TH />
                 <Table.TH className="amount">Total</Table.TH>
               </Table.TR>
            </div>
            {
               assetrow({
                  head: 'Networth',
                  amount: pl.networth,
                  title: 'How much you own minus how much you how at the end of the period',
                  bold: true
               })
            }
            {
               assetrow({
                  head: 'Liquid assets',
                  amount: pl.liquid_assets,
                  title: "The part of your assets in savings, checkings, investments and stocks",
                  padding: 1,
               })
            }
            {
               assetrow({
                  head: 'Other assets',
                  amount: pl.networth - pl.liquid_assets,
                  title: "The part of your assets that cannot be sold quickly, like real-estate, jewels,..",
                  padding: 1,
               })
            }
         </div>
      </div>
   );
}
export default Cashflow;
