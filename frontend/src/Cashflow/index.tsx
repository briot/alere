import * as React from 'react';
import { DateRange, monthCount, rangeDisplay, rangeToHttp } from 'Dates';
import { SetHeaderProps } from 'Dashboard/Panel';
import Numeric from 'Numeric';
import usePrefs from 'services/usePrefs';
import './Cashflow.css';

interface Metric {
   income: number;
   passive_income: number;
   expenses: number;
   active: number;
   passive: number;
   liquid_assets: number;
   income_taxes: number;
   other_taxes: number;
}

const useFetchPL = (range: DateRange, currencyId: string) => {
   const [data, setData] = React.useState<Metric>({
      income: NaN,
      expenses: NaN,
      active: NaN,
      passive: NaN,
      liquid_assets: NaN,
      income_taxes: NaN,
      other_taxes: NaN,
      passive_income: NaN,
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
   descr: string | React.ReactNode;
   value: number | React.ReactNode;
   ideal: number;
   compare: string;
   suffix: string;
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
         {
            React.isValidElement(p.descr)
            ? p.descr
            : <p className="descr">{p.descr}</p>
         }
         <div className="values" >
            {
               !isNaN(p.ideal)  &&
               <span className="recommended">
                  {p.compare} <Numeric amount={p.ideal} precision={0} />{p.suffix}
               </span>
            }
            {
               React.isValidElement(p.value)
               ? (
               <span className="value">
                  {p.value}
               </span>
               )
               : (
               <span className="value">
                  <Numeric amount={p.value as number} />{p.suffix}
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

const Cashflow: React.FC<CashflowProps & SetHeaderProps> = p => {
   const { prefs } = usePrefs();
   const pl = useFetchPL(p.range, prefs.currencyId);

   const { setHeader } = p;
   React.useEffect(
      () => setHeader?.(`Metrics ${rangeDisplay(p.range)}`),
      [setHeader, p.range]
   );

   const months = monthCount(p.range);
   const monthly_expenses = -pl.expenses / months;
   const networth = pl.active + pl.passive;
   const cashflow = pl.income + pl.expenses;
   const saving_percent = cashflow / pl.income * 100;

   return (
      <div className="cashflow">
         <h3>Security</h3>

         {/* thepoorswiss.com/11-best-personal-finance-metrics/ */}
         <Metrics
            name="Savings rate"
            descr="How much of your income you are saving"
            value={saving_percent}
            ideal={24}
            compare=">"
            suffix="%"
         />
         {/* www.doughroller.net/personal-finance/3-step-financial-checkup/ */}
         <Metrics
            name="Emergency Fund Ratio"
            descr="How many months worth of expenses can be funded through liquid assets, including investments and stocks"
            value={pl.liquid_assets / monthly_expenses}
            ideal={4}
            compare=">"
            suffix="months"
         />
         <Metrics
            name="Actual income tax rate"
            descr="How much of your income you spend on taxes. This only includes income taxes, not other taxes"
            value={pl.income_taxes / pl.income * 100}
            ideal={10}
            compare="<"
            suffix="%"
         />

         <h3>Comfort</h3>

         <Metrics
            name="Wealth"
            descr="How many months worth of expenses you own, total"
            value={networth / monthly_expenses}
            ideal={6}
            compare=">"
            suffix="months"
         />
         <Metrics
            name="Return on Investment"
            descr="How much passive investment your whole networth provides"
            value={pl.passive_income / networth * 100}
            ideal={4}
            compare=">"
            suffix="%"
         />
         <Metrics
            name="Return on Investment for liquid assets"
            descr="How much passive investment your liquid assets provides"
            value={pl.passive_income / pl.liquid_assets * 100}
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
            descr="Part of your expenses covered by passive income (investments, rents,...)"
            value={pl.passive_income / -pl.expenses * 100}
            ideal={100}
            compare=">"
            suffix="%"
         />
         <Metrics
            name="Passive income"
            descr="What part of the total income comes from sources other than the result of our work (salary,...)"
            value={pl.passive_income / pl.income * 100}
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
            suffix={prefs.currencyId}
         />

         <h3>Metrics</h3>

         <Metrics
            name="Cashflow"
            descr={
               <div>
                  <div>
                     Total income (
                     <Numeric amount={pl.income} currency={prefs.currencyId} />
                     {
                        !isNaN(months) &&
                        <>
                           ,&nbsp;
                           <Numeric
                              amount={pl.income / months}
                              currency={prefs.currencyId}
                           />
                           &nbsp;/&nbsp;month
                        </>
                     }
                  )
                  </div>
                  <div>
                     - Total expenses (
                     <Numeric amount={-pl.expenses} currency={prefs.currencyId} />
                     {
                        !isNaN(months) &&
                        <>
                           ,&nbsp;
                           <Numeric
                              amount={-pl.expenses / months}
                              currency={prefs.currencyId}
                           />
                           &nbsp;/&nbsp;month
                        </>
                     }
                  )
                  </div>
               </div>
            }
            value={
               <div>
                  <div>
                     <Numeric amount={cashflow} currency={prefs.currencyId} />
                     {
                        !isNaN(months) &&
                        <span>&nbsp;/&nbsp; {months} months</span>
                     }
                  </div>
                  {
                     !isNaN(months) &&
                     <div>
                        <Numeric
                           amount={cashflow / months}
                           currency={prefs.currencyId}
                        />
                        &nbsp;/&nbsp; month
                     </div>
                  }
               </div>
            }
            ideal={NaN}
            compare=">"
            suffix=""
         />

         <Metrics
            name="Networth"
            descr={
               <div>
                  At the end of the selected period,
                  <div>
                     how much you own (
                     <Numeric amount={pl.active} currency={prefs.currencyId} />
                     )
                  </div>
                  <div>
                     - how much you owe (
                     <Numeric amount={-pl.passive} currency={prefs.currencyId} />
                  )
                  </div>
               </div>
            }
            value={
               <Numeric amount={networth} currency={prefs.currencyId} />
            }
            ideal={NaN}
            compare=">"
            suffix=""
         />

         <Metrics
            name="Passive income"
            descr="Income that would remain if you stopped working"
            value={
               <Numeric amount={pl.passive_income} currency={prefs.currencyId} />
            }
            ideal={NaN}
            compare=">"
            suffix=""
         />

         <Metrics
            name="Liquid assets"
            descr="The part of your assets in savings, checkings, investments and stocks"
            value={
               <Numeric amount={pl.liquid_assets} currency={prefs.currencyId} />
            }
            ideal={NaN}
            compare=">"
            suffix=""
         />

         <Metrics
            name="Taxes"
            descr="How much taxes you paid in that period"
            value={
               <div>
                  <div>
                     Income:&nbsp;
                     <Numeric
                        amount={pl.income_taxes}
                        currency={prefs.currencyId}
                     />
                  </div>
                  <div>
                     Other:&nbsp;
                     <Numeric
                        amount={pl.other_taxes}
                        currency={prefs.currencyId}
                     />
                  </div>
               </div>
            }
            ideal={NaN}
            compare=">"
            suffix=""
         />
      </div>
   );
}
export default Cashflow;