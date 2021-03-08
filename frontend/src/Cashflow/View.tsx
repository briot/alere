import * as React from 'react';
import { DateRange, monthCount, rangeToHttp } from 'Dates';
import { Commodity, CommodityId } from 'services/useAccounts';
import { Link } from 'react-router-dom';
import Numeric from 'Numeric';
import Table from 'List';
import Tooltip, { TooltipProps } from 'Tooltip';
import usePrefs from 'services/usePrefs';
import useFetch from 'services/useFetch';
import './Cashflow.scss';

const commMonths: Commodity = {
   id: -2,
   name: "month",
   symbol_before: '',
   symbol_after: 'months',
   qty_scale: 1,
   price_scale: 1,
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
   liquid_assets_at_start: number;
}

const NULL_METRIC: Metric = {
   income: NaN,
   passive_income: NaN,
   expenses: NaN,
   work_income: NaN,
   networth: NaN,
   networth_start: NaN,
   liquid_assets: NaN,
   liquid_assets_at_start: NaN,
   income_taxes: NaN,
   other_taxes: NaN,
};

const useFetchPL = (range: DateRange, currencyId: CommodityId) => {
   const { data } = useFetch<Metric, any>({
      url: `/api/metrics?${rangeToHttp(range)}&currency=${currencyId}`,
   });
   return data ?? NULL_METRIC;
}

interface MetricsProps extends TooltipProps<undefined> {
   name: string;
   descr: string;
   value: number | React.ReactNode;
   ideal?: number;
   compare?: string;
   commodity?: CommodityId|Commodity;
   suffix?: string;
}

const Metrics: React.FC<MetricsProps> = p => {
   if (p.value === null || p.value === undefined ||
       (isNaN(p.value as any) && !React.isValidElement(p.value))
   ) {
      return null;
   }

   return (
      <div className="metrics">
         <div>
            <h5>{p.name}</h5>
            <p className="descr">{p.descr}</p>
         </div>
         <div className="values" >
            {
               /*
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
               */
            }
            {
               <Tooltip {...p} >
                  <span className="value">
                  {
                     React.isValidElement(p.value)
                     ? p.value
                     : <Numeric
                           amount={p.value as number}
                           commodity={p.commodity}
                           suffix={p.suffix}
                        />
                  }
                  </span>
               </Tooltip>
            }
         </div>
      </div>
   );
}

const SectionHeader: React.FC<{}> = (p: {}) => null; // <h3>{s}</h3>


export interface CashflowProps {
   range: DateRange;
   roundValues?: boolean;
}

const Cashflow: React.FC<CashflowProps> = p => {
   const { prefs } = usePrefs();
   const currency = prefs.currencyId;
   const pl = useFetchPL(p.range, currency);
   const months = monthCount(p.range);
   const monthly_expenses = pl.expenses / months;
   const networth_delta = pl.networth - pl.networth_start;
   const cashflow = pl.income - pl.expenses;
   const unrealized = networth_delta - cashflow;

   const non_work_income = pl.passive_income + unrealized;

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
         style={{borderTop: r.border ? "1px solid var(--table-color)" : ""}}
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

   const assetrow = (r: {
      head: string,
      amount: number,
      tooltip?: string,
      bold?: boolean,
      padding?: number
   }) => (
      <Table.TR
         tooltip={r.tooltip}
      >
         {r.bold ? (
            <>
               <Table.TH>
                  {r.head}
               </Table.TH>
               <Table.TH className="amount">
                  <Numeric
                     amount={r.amount}
                     commodity={currency}
                     scale={p.roundValues ? 0 : undefined}
                  />
               </Table.TH>
            </>
         ): (
            <>
               <Table.TD
                  style={{paddingLeft: (r.padding ?? 0) * 20}}
               >
                  {r.head}
               </Table.TD>
               <Table.TD className="amount">
                  <Numeric
                     amount={r.amount}
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
         <SectionHeader>Security</SectionHeader>

         {/* thepoorswiss.com/11-best-personal-finance-metrics/ */}
         <Metrics
            name="Savings rate"
            descr="How much of your realized income you are saving"
            value={cashflow / pl.income * 100}
            tooltip={() =>
               <p>
                  cashflow <Numeric amount={cashflow} />
                  <br/>
                  / income <Numeric amount={pl.income} />
               </p>
            }
            ideal={24}
            compare=">"
            suffix="%"
         />
         {/* www.doughroller.net/personal-finance/3-step-financial-checkup/ */}
         <Metrics
            name="Emergency Fund Ratio"
            descr="How many months worth of expenses can be funded through liquid assets"
            value={pl.liquid_assets / monthly_expenses}
            tooltip={() =>
               <p>
                  liquid assets <Numeric amount={pl.liquid_assets} />
                  <br/>
                  / monthly expenses <Numeric amount={monthly_expenses} />
               </p>
            }
            ideal={4}
            compare=">"
            commodity={commMonths}
         />
         <Metrics
            name="Actual income tax rate"
            descr="How much of your income you spend on income taxes"
            value={pl.income_taxes / pl.income * 100}
            tooltip={() =>
               <p>
                  Income taxes <Numeric amount={pl.income_taxes} />
                  <br/>
                  / Total income <Numeric amount={pl.income} />
               </p>
            }
            ideal={10}
            compare="<"
            suffix="%"
         />

         <SectionHeader>Comfort</SectionHeader>

         <Metrics
            name="Wealth"
            descr="How many months worth of expenses you own in total"
            value={pl.networth / monthly_expenses}
            tooltip={() =>
               <p>
                  Networth <Numeric amount={pl.networth} />
                  <br/>
                  / Monthly expenses <Numeric amount={monthly_expenses} />
               </p>
            }
            ideal={6}
            compare=">"
            commodity={commMonths}
         />
         <Metrics
            name="Return on Investment"
            descr="How much passive income your whole networth provides"
            value={non_work_income / pl.networth_start * 100}
            tooltip={() =>
               <p>
                  Passive income and unrealized
                  gains <Numeric amount={non_work_income} />
                  <br/>
                  / Networth at start <Numeric amount={pl.networth_start} />
               </p>
            }
            ideal={4}
            compare=">"
            suffix="%"
         />
         <Metrics
            name="Return on Investment for liquid assets"
            descr="How much passive income your liquid assets provides"
            value={non_work_income / pl.liquid_assets_at_start * 100}
            tooltip={() =>
               <p>
                  Passive income and unrealized
                  gains <Numeric amount={non_work_income} />
                  <br />
                  / Liquid assets at
                  start <Numeric amount={pl.liquid_assets_at_start} />
               </p>
            }
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

         <SectionHeader>Wealth</SectionHeader>

         <Metrics
            name="Financial independence"
            descr="Part of your expenses covered by passive income"
            value={non_work_income / pl.expenses * 100}
            tooltip={() =>
               <p>
                  Passive income and unrealized
                  gains <Numeric amount={non_work_income} />
                  <br />
                  / Expenses <Numeric amount={pl.expenses} />
               </p>
            }
            ideal={100}
            compare=">"
            suffix="%"
         />
         <Metrics
            name="Passive income"
            descr="What part of the total income comes from sources other than the result of our work"
            value={non_work_income / pl.income * 100}
            tooltip={() =>
               <p>
                  Passive income and unrealized
                  gains <Numeric amount={non_work_income} />
                  <br/>
                  / Total Income <Numeric amount={pl.income} />
               </p>
            }
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

         <h4>Cashflow</h4>

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
                     url: `/ledger/work_income?range=${p.range}`,
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
                     url: `/ledger/passive_income?range=${p.range}`,
                  })
               }
               {
                  pl.income - pl.work_income - pl.passive_income !== 0 &&
                  flowrow({
                     head: '  Other income',
                     amount: pl.income - pl.work_income - pl.passive_income,
                     tooltip: "Unclassified income",
                     padding: 1,
                  })
               }
               {
                  flowrow({
                     head: 'Total expenses',
                     amount: -pl.expenses,
                     tooltip: "Sum of all expenses during that period",
                     bold: true,
                     url: `/ledger/expenses?range=${p.range}`,
                  })
               }
               {
                  pl.income_taxes !== 0 &&
                  flowrow({
                     head: 'Income taxes',
                     amount: -pl.income_taxes,
                     padding: 1,
                     url: `/ledger/income_taxes?range=${p.range}`,
                  })
               }
               {
                  pl.other_taxes !== 0 &&
                  flowrow({
                     head: 'Other taxes',
                     amount: -pl.other_taxes,
                     padding: 1,
                     url: `/ledger/other_taxes?range=${p.range}`,
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
                     padding: 1,
                  })
               }
               {
                  flowrow({
                     head: 'Networth change',
                     amount: networth_delta,
                     tooltip: "How much your total networth change during that period",
                     bold: true,
                     border: true,
                  })
               }
            </div>
         </div>

         <h4>Assets</h4>

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
                  tooltip: 'How much you own minus how much you how at the end of the period',
                  bold: true
               })
            }
            {
               assetrow({
                  head: 'Liquid assets',
                  amount: pl.liquid_assets,
                  tooltip: "The part of your assets in savings, checkings, investments and stocks",
                  padding: 1,
               })
            }
            {
               assetrow({
                  head: 'Other assets',
                  amount: pl.networth - pl.liquid_assets,
                  tooltip: "The part of your assets that cannot be sold quickly, like real-estate, jewels,..",
                  padding: 1,
               })
            }
         </div>
      </div>
   );
}
export default Cashflow;
