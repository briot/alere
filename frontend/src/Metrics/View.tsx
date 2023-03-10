import * as React from 'react';
import { DateRange, monthCount, display_months } from '@/Dates';
import { Commodity, CommodityId } from '@/services/useAccounts';
import Numeric from '@/Numeric';
import Tooltip, { TooltipProps } from '@/Tooltip';
import usePrefs from '@/services/usePrefs';
import usePL from '@/services/usePL';
import { isNumeric} from '@/services/utils';

import "./Metrics.scss";

interface MetricsLineProps extends TooltipProps<undefined> {
   name: string;
   descr: string;
   value: number | React.ReactNode;
   commodity?: CommodityId|Commodity;
   suffix?: string;
}

const MetricsLine: React.FC<MetricsLineProps> = p => {
   if (p.value === null
       || p.value === undefined
       // || (isNaN(p.value as any) && !React.isValidElement(p.value))
   ) {
      return null;
   }

   return (
      <div className="metrics">
         <div>
            <p>{p.name}</p>
            <p className="descr">{p.descr}</p>
         </div>
         <div className="values" >
            {
               <Tooltip {...p} >
                  <span className="value">
                  {
                     isNumeric(p.value)
                     ? <Numeric
                           amount={p.value as number}
                           commodity={p.commodity}
                           suffix={p.suffix}
                        />
                     : p.value
                  }
                  </span>
               </Tooltip>
            }
         </div>
      </div>
   );
}

export interface MetricsProps {
   range: DateRange;
   roundValues?: boolean;
}

const Metrics: React.FC<MetricsProps> = p => {
   const { prefs } = usePrefs();
   const currency = prefs.currencyId;
   const pl = usePL(p.range, currency);
   const months = monthCount(p.range);
   const monthly_expenses = pl.expenses / months;
   const networth_delta = pl.networth - pl.networth_start;
   const cashflow = pl.income - pl.expenses;
   const unrealized = networth_delta - cashflow;

   const non_work_income = pl.passive_income + unrealized;

   return (
      <div className="cashflow">
         {/* thepoorswiss.com/11-best-personal-finance-metrics/ */}
         <MetricsLine
            name="Savings rate"
            descr="How much of your realized income you are saving"
            value={cashflow / pl.income * 100}
            tooltip={() =>
               <p>
                  cashflow <Numeric amount={cashflow} />
                  <br/>
                  / income <Numeric amount={pl.income} />
                  <br/>
                  Goal: more than 20%
               </p>
            }
            suffix=" %"
         />

      {/*
         <MetricsLine
            name="Housing expenses"
            descr="How much you spend on housing, including rent, electricity, gaz, home improvements,..."
            value={NaN}
            ideal={33}
            suffix=" %"
         />
         */}

         <MetricsLine
            name="Financial independence"
            descr="Part of your expenses covered by passive income"
            value={non_work_income / pl.expenses * 100}
            tooltip={() =>
               <p>
                  Passive income and unrealized
                  gains <Numeric amount={non_work_income} />
                  <br />
                  / Expenses <Numeric amount={pl.expenses} />
                  <br/>
                  Goal: more than 100%
               </p>
            }
            suffix=" %"
         />
         <MetricsLine
            name="Passive income"
            descr="What part of the total income comes from sources other than the result of our work"
            value={non_work_income / pl.income * 100}
            tooltip={() =>
               <p>
                  Passive income and unrealized
                  gains <Numeric amount={non_work_income} />
                  <br/>
                  / Total Income <Numeric amount={pl.income} />
                  <br/>
                  Goal: more than 50%
               </p>
            }
            suffix=" %"
         />

         <MetricsLine
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
                  <br/>
                  Goal: more than 4%
               </p>
            }
            suffix=" %"
         />

         <MetricsLine
            name="Return on Investment"
            descr="How much passive income your whole networth provides"
            value={non_work_income / pl.networth_start * 100}
            tooltip={() =>
               <p>
                  Passive income and unrealized
                  gains <Numeric amount={non_work_income} />
                  <br/>
                  / Networth at start <Numeric amount={pl.networth_start} />
                  <br/>
                  Goal: more than 4%
               </p>
            }
            suffix=" %"
         />

      {/*
         <MetricsLine
            name="Metrics minus savings"
            descr="What part of the cashflow you invest (vs let it sleep in savings and checkings accounts)"
            value={NaN}
            ideal={0}
            commodity={currency}
         />
         */}

         {/* www.doughroller.net/personal-finance/3-step-financial-checkup/ */}
         <MetricsLine
            name="Emergency Fund Ratio"
            descr="How many months worth of expenses can be funded through liquid assets"
            value={display_months(pl.liquid_assets / monthly_expenses)}
            tooltip={() =>
               <p>
                  liquid assets <Numeric amount={pl.liquid_assets} />
                  <br/>
                  / monthly expenses <Numeric amount={monthly_expenses} />
                  <br/>
                  Goal: more than 4 months
               </p>
            }
         />

         <MetricsLine
            name="Wealth"
            descr="How many months worth of expenses you own in total"
            value={display_months(pl.networth / monthly_expenses)}
            tooltip={() =>
               <p>
                  Networth <Numeric amount={pl.networth} />
                  <br/>
                  / Monthly expenses <Numeric amount={monthly_expenses} />
                  <br/>
                  Goal: more than 6 months
               </p>
            }
         />

         <MetricsLine
            name="Actual income tax rate"
            descr="How much of your income you spend on income taxes"
            value={pl.income_taxes / pl.income * 100}
            tooltip={() =>
               <p>
                  Income taxes <Numeric amount={pl.income_taxes} />
                  <br/>
                  / Total income <Numeric amount={pl.income} />
                  <br/>
                  Goal: less than 10%
               </p>
            }
            suffix=" %"
         />
      </div>
   );
}
export default Metrics;
