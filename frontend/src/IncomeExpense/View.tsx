import * as React from 'react';
import { Legend, PieChart, PieLabelRenderProps,
         XAxis, YAxis, BarChart, Bar, CartesianGrid, LabelList,
         Pie, Cell, Tooltip, TooltipProps } from 'recharts';
import { DateRange } from '@/Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from '@/Numeric';
import AccountName from '@/Account/AccountName';
import usePrefs from '@/services/usePrefs';
import useColors from '@/services/useColors';
import useFetchIE, {
   IncomeExpenseInPeriod, OneIE } from '@/services/useFetchIE';
import './IncomeExpense.scss';

const MIN_BAR_HEIGHT = 10;
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

const CustomTooltip = (
   p: TooltipProps<number, string>
      & {data: IncomeExpenseInPeriod, range: DateRange}
) => {
   const pay = p.payload?.[0];
   if (!pay) {
      return null;
   }
   const value = pay.value as number;
   const total = p.data.items.reduce((t: number, d: OneIE) => t + d.value, 0);
   return p.active
     ? (
       <div className="tooltip-base" >
           <AccountName
              id={pay.payload.accountId}
              account={pay.payload.account}
              range={p.range}
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
   showBars?: boolean;
}

const IncomeExpense: React.FC<IncomeExpenseProps> = p => {
   const { prefs } = usePrefs();
   const data = useFetchIE({
      ...p,
      include_expenses: p.expenses,
      include_income: !p.expenses,
   });
   const normalized = React.useMemo(
      () => {
         if (!data) {
            return null;
         }
         const items = data.items.map(it => ({
            ...it,
            value: p.expenses ? -it.value : it.value,
         }));
         items.sort((a, b) => b.value - a.value);
         return {...data,
                 total: p.expenses ? -data.total : data.total,
                 items};
      },
      [data, p.expenses]
   );
   const color = useColors(
      p.expenses,
      Math.min(10, normalized?.items.length ?? 1)
   );

   if (!normalized) {
      return null; // only when fetch was disabled
   }

   const legendItem = (
      value: React.ReactNode,
      entry: unknown,
      index?: number
   ) =>
      index === undefined
         ? <span>{value}</span>
         : (
           <span>
              <AccountName
                  id={normalized.items[index].accountId}
                  account={normalized.items[index].account}
                  range={p.range}
              />

              <Numeric
                 amount={normalized.items[index].value}
                 commodity={prefs.currencyId}
                 scale={p.roundValues ? 0 : undefined}
              />
              <Numeric
                 amount={normalized.items[index].value / normalized.total * 100}
                 suffix='%'
              />
           </span>
         );

   return (
      <div className="columns">
         <div className="total">
            <h5>Total</h5>
            <Numeric
               amount={normalized.total}
               commodity={prefs.currencyId}
               scale={p.roundValues ? 0 : undefined}
            />
         </div>
         <div style={{ flex: '1 1 auto' }}>
            <AutoSizer>
            {
               p.showBars ?
                  ({width, height}) => (
                  <div
                     style={{width: width,
                             height: height,
                             overflow:'auto'}}
                  >
                     <BarChart
                        width={width - 20 /* scrollbar width ??? */}
                        height={
                           /* lines should have minimal height to keep label
                            * readable */
                           Math.max(
                              normalized.items.length * MIN_BAR_HEIGHT,
                              height
                           ) - 4
                        }
                        className="incomeexpense"
                        layout="vertical"
                        data={normalized.items}
                        barGap={0}
                     >
                        <XAxis
                           dataKey="value"
                           domain={['auto', 'auto']}
                           type="number"
                           tickCount={10}
                        />
                        <YAxis
                           dataKey="name"
                           type="category"
                           hide={true}
                           interval={0}
                        />
                        <CartesianGrid
                           horizontal={false}
                           strokeDasharray="5 5"
                        />
                        <Tooltip
                           content={
                              <CustomTooltip
                                 data={normalized}
                                 range={p.range}
                              />}
                        />
                        <Bar
                            dataKey="value"
                            isAnimationActive={false}
                        >
                           {
                              normalized.items.map((it, idx) =>
                                 <Cell
                                    key={idx}
                                    fill={color(idx)}
                                 />
                              )
                           }
                           <LabelList
                              dataKey="name"
                              position="left"
                              width={undefined /* do not break lines */}
                           />
                        </Bar>
                     </BarChart>
                  </div>

               ) :
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
                     content={
                        <CustomTooltip data={normalized} range={p.range} />
                     }
                  />
                  <Pie
                     data={normalized.items}
                     cx="50%"
                     cy="50%"
                     isAnimationActive={false}
                     labelLine={false}
                     label={false && renderCustomizedLabel}
                     outerRadius="100%"
                     innerRadius="60%"
                     fill="#8884d8"
                     dataKey="value"
                     nameKey="name"
                  >
                     {
                        normalized.items.map((entry, index) =>
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
