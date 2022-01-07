import * as React from 'react';
import { Legend, PieChart, PieLabelRenderProps, Sector, SectorProps,
         XAxis, YAxis, BarChart, Bar, CartesianGrid, LabelList, Label,
         Pie, Cell, Tooltip, TooltipProps, LabelProps } from 'recharts';
import { DateRange } from '@/Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric, { useNumericFormat } from '@/Numeric';
import AccountName from '@/Account/AccountName';
import usePrefs from '@/services/usePrefs';
import useColors from '@/services/useColors';
import useFetchIE, {
   IncomeExpenseInPeriod, OneIE } from '@/services/useFetchIE';
import './IncomeExpense.scss';

const MIN_BAR_HEIGHT = 10;
const ACTIVE_SECTOR_RADIUS = 4;  // extra radius for active sector
const RADIAN = Math.PI / 180;
const MAX_GRADIENT_STEPS = 20;

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
         fill="black"
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

const renderActiveShape = (p: SectorProps) => {
  return (
     <Sector
       cx={p.cx}
       cy={p.cy}
       innerRadius={p.innerRadius}
       outerRadius={p.outerRadius! + ACTIVE_SECTOR_RADIUS}
       startAngle={p.startAngle}
       endAngle={p.endAngle}
       fill={p.fill}
     />
  );
};


export interface IncomeExpenseProps {
   expenses: boolean;
   range: DateRange;
   roundValues?: boolean;
   showBars?: boolean;
   hideLegend?: boolean;
}

const IncomeExpense: React.FC<IncomeExpenseProps> = p => {
   const { prefs } = usePrefs();
   const [ activeIndex, setActiveIndex ] = React.useState(-1);
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
      Math.min(MAX_GRADIENT_STEPS, normalized?.items.length ?? 1)
   );

   const formatted = useNumericFormat({
      amount:
         activeIndex === -1
         ? normalized?.total
         : normalized?.items[activeIndex].value,
      commodity: prefs.currencyId,
      scale: p.roundValues ? 0 : undefined,
   });

   const onEnter = React.useCallback(
      (_, index) => setActiveIndex(index),
      []
   );
   const onLeave = React.useCallback(
      (_, index) => setActiveIndex(-1),
      []
   );

   const centerLabel = React.useCallback(
      (a: LabelProps) => {
         // We expect PolarViewBox, not CartesianViewBox
         if (!a.viewBox || !("cx" in a.viewBox) || !normalized) {
            return;
         }
         const cx = a.viewBox.cx ?? 0;
         const title = (
            activeIndex !== -1
            ? normalized.items[activeIndex]?.name
            : p.expenses
            ? 'Expenses'
            : 'Income'
         );
         const percent = (
            activeIndex === -1
            ? NaN
            : (normalized.items[activeIndex].value ?? NaN) / normalized.total
         );

         return (
            <text
              x={cx}
              y={a.viewBox.cy ?? 0}
              dy="-1em"
              className="recharts-text recharts-label total"
              textAnchor="middle"
              dominantBaseline="central"
            >
              <tspan className="legend" x={cx}>
                 {title}
              </tspan>
              <tspan
                  alignmentBaseline="middle"
                  className="numeric"
                  dy="0.8em"
                  x={cx}
              >
                {formatted.prefix} {formatted.text} {formatted.suffix}
              </tspan>
              {
                 activeIndex !== -1 && !isNaN(percent)
                 ? (
                    <tspan className="legend" x={cx} dy="1.6em" >
                       {(percent * 100).toFixed(2)} %
                    </tspan>
                 ) : (
                    <tspan className="legend" x={cx} dy="1.6em" >
                      in period
                    </tspan>
                 )
              }
            </text>
         );
      },
      [formatted, p.expenses, activeIndex, normalized]
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
                  width >= 400 && !p.hideLegend &&
                  <Legend
                     align="right"
                     formatter={legendItem}
                     layout="vertical"
                     verticalAlign="top"
                  />
               }
               <Pie
                  data={normalized.items}
                  cx="50%"
                  cy="50%"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  isAnimationActive={false}
                  labelLine={false}
                  label={false && renderCustomizedLabel}
                  outerRadius={`${100 - ACTIVE_SECTOR_RADIUS}%`}
                  innerRadius="70%"
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
               >
                  {
                     normalized.items.map((entry, index) =>
                        <Cell
                           key={`cell-${index}`}
                           fill={color(index)}
                           className={
                              activeIndex !== -1
                              && index !== activeIndex
                              ? 'inactive' : ''
                           }
                        />)
                  }
                  <Label content={centerLabel} />
               </Pie>
               </PieChart>
            )
         }
         </AutoSizer>
         {
            p.showBars &&
            <div className="totalBars">
               Total:&nbsp;
               <Numeric
                  className="total"
                  amount={normalized?.total}
                  commodity={prefs.currencyId}
                  scale={p.roundValues ? 0 : undefined}
               />
            </div>
         }
      </div>
   );
}
export default IncomeExpense;
