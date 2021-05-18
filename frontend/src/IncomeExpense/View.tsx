import * as React from 'react';
import * as d3Scale from 'd3-scale';
import { Legend, PieChart, PieLabelRenderProps,
         Pie, Cell, Tooltip, TooltipProps } from 'recharts';
import { DateRange, rangeToHttp } from 'Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from 'Numeric';
import AccountName from 'Account';
import useAccounts, { AccountId, Account } from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import useFetch from 'services/useFetch';
import './IncomeExpense.scss';

const NAME_KEY = "nam";

interface DataItemType {
   account: Account | undefined;
   accountId: AccountId;
   value: number;
   [NAME_KEY]?: string;   // computed automatically
}
interface DataType {
   items:   DataItemType[];
   mindate: string;
   maxdate: string;
   total: number;
}
const noData: DataType = {
   items: [], mindate: 'today', maxdate: 'today', total: 0};

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = (p: PieLabelRenderProps) => {
   const inner = p.innerRadius as number;
   const outer = p.outerRadius as number;
   const mid = p.midAngle || 0;
   const radius = inner + (outer - inner) * 0.5;
   const cx = Number(p.cx) || 0;
   const cy = Number(p.cy) || 0
   const x = cx + radius * Math.cos(-mid * RADIAN) || 0;
   const y = cy + radius * Math.sin(-mid * RADIAN) || 0;

   return (
      <text
         x={x}
         y={y}
         fill="white"
         textAnchor={x > cx ? 'start' : 'end'}
         dominantBaseline="central"
      >
         {`${((p.percent ?? 0) * 100).toFixed(0)}%`}
      </text>
  );
};

const CustomTooltip = (p: TooltipProps<number, string> & {data: DataType} ) => {
   const pay = p.payload?.[0];
   if (!pay) {
      return null;
   }
   const value = pay.value as number;
   const total = p.data.items.reduce((t: number, d: DataItemType) => t + d.value, 0);
   return p.active
     ? (
       <div className="tooltip-base" >
           <AccountName
              id={pay.payload.accountId}
              account={pay.payload.account}
           />
           <div>
              <Numeric
                 amount={value}
                 commodity={pay.payload.account.commodity}
              />
           </div>
           <Numeric
               amount={value / total * 100}
               suffix="%"
           />
       </div>
     ) : null;
};


export interface IncomeExpenseProps {
   expenses: boolean;
   range: DateRange;
   roundValues?: boolean;
}

const IncomeExpense: React.FC<IncomeExpenseProps> = p => {
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const { data }  = useFetch({
      url: `/api/plots/category/${p.expenses ? 'expenses' : 'income'}`
        + `?${rangeToHttp(p.range)}&currency=${prefs.currencyId}`,
      parse: (json: DataType) => {
         const d = {
            items: json.items,
            mindate: json.mindate,
            maxdate: json.maxdate,
            total: json.items.reduce((tot, v) => tot + v.value, 0),
         };
         d.items.forEach(a => {
            a.account = accounts.getAccount(a.accountId);
            a[NAME_KEY] = a.account?.name;
         });
         return d;
      },
      placeholder: noData,
   });

   if (!data) {
      return null; // only when fetch was disabled
   }

   const legendItem = (value: React.ReactNode, entry: unknown, index?: number) =>
      index === undefined
         ? <span>{value}</span>
         : (
           <span>
              <AccountName
                  id={data.items[index].accountId}
                  account={data.items[index].account}
              />

              <Numeric
                 amount={data.items[index].value}
                 commodity={prefs.currencyId}
                 scale={p.roundValues ? 0 : undefined}
              />
              <Numeric
                 amount={data.items[index].value / data.total * 100}
                 suffix='%'
              />
           </span>
         );

   const style = getComputedStyle(
      document.getElementById('app') || document.documentElement);
   const color1 = style.getPropertyValue(
      p.expenses ? "--expense-gradient-1" : "--income-gradient-1");
   const color2 = style.getPropertyValue(
      p.expenses ? "--expense-gradient-2" : "--income-gradient-2");

   const modulo = 10;
   const colorScale = d3Scale.scaleLinear<string>()
      .domain([0, Math.min(modulo, data.items.length - 1)])
      .range([color1, color2]);
   const color = (index: number) => colorScale(index % modulo);

   return (
      <div className="columns">
         <div className="total">
            <h5>Total</h5>
            <Numeric
               amount={data.total}
               commodity={prefs.currencyId}
               scale={p.roundValues ? 0 : undefined}
            />
         </div>
         <div style={{ flex: '1 1 auto' }}>
            <AutoSizer>
            {
               ({width, height}) => (
                  <PieChart
                     width={width}
                     height={height}
                     className="incomeexpense"
                  >
                  {
                     width >= 400 &&
                     <Legend
                        align="right"
                        formatter={legendItem}
                        layout="vertical"
                        verticalAlign="top"
                     />
                  }
                  <Tooltip
                     content={<CustomTooltip data={data} />}
                  />
                  <Pie
                     data={data.items}
                     cx="50%"
                     cy="50%"
                     isAnimationActive={false}
                     labelLine={false}
                     label={false && renderCustomizedLabel}
                     outerRadius="100%"
                     innerRadius="60%"
                     fill="#8884d8"
                     dataKey="value"
                     nameKey={NAME_KEY}
                  >
                     {
                        data.items.map((entry, index) =>
                           <Cell
                              key={`cell-${index}`}
                              fill={color(index)}
                           />)
                     }
                  </Pie>
                  </PieChart>
               )
            }
            </AutoSizer>
         </div>
      </div>
   );
}
export default IncomeExpense;
