import * as React from 'react';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import { Legend, PieChart, PieLabelRenderProps,
         Pie, Cell, Tooltip, TooltipProps } from 'recharts';
import { AccountId } from 'Transaction';
import { DateRange, rangeToHttp } from 'Dates';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from 'Numeric';
import Account from 'Account';
import useAccounts from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import './CategoryPie.css';

const NAME_KEY = "nam";

interface DataItemType {
   accountId: AccountId;
   value: number;
   [NAME_KEY]?: string;   // computed automatically
}
interface DataType {
   items:   DataItemType[];
   mindate: string;
   maxdate: string;
}
const noData: DataType = {items: [], mindate: 'today', maxdate: 'today'};

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
         {`${((p.percent || 0) * 100).toFixed(0)}%`}
      </text>
  );
};

const CustomTooltip = (p: TooltipProps & {data: DataType} ) => {
   const pay = p.payload?.[0];
   if (!pay) {
      return null;
   }
   const value = pay.value as number;
   const total = p.data.items.reduce((t, d) => t + d.value, 0);
   return p.active
     ? (
       <div className="customTooltip" >
           <Account id={pay.payload.accountId} />
           <div>
              <Numeric amount={value} />
           </div>
           <div className="numeric">
              {(value / total * 100).toFixed(2)}
              %
           </div>
       </div>
     ) : null;
};


export interface PiePlotProps {
   expenses: boolean;
   range: DateRange;
}

const CategoryPie: React.FC<PiePlotProps> = p => {
   const [data, setData] = React.useState(noData);
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/plots/category/${p.expenses ? 'expenses' : 'income'}`
               + `?${rangeToHttp(p.range)}`
            );
            const d: DataType = await resp.json();

            d.items.forEach(a => a[NAME_KEY] = accounts.name(a.accountId));

            // Filter out negative data, which we cannot show in a pie graph
            setData({
               items: d.items.filter(v => v.value > 0),
               mindate: d.mindate,
               maxdate: d.maxdate,
            });
         }
         dofetch();
      },
      [p.expenses, p.range, accounts]
   );

   const legendItem = (value: any, entry: any, index?: number) =>
      index === undefined
         ? <span>{value}</span>
         : (
           <span>
              <Account id={data.items[index].accountId} />
              &nbsp;(
                  <Numeric
                     amount={data.items[index].value}
                     currency={prefs.currencyId}
                  />
               )
           </span>
         );

   const color = p.expenses
      ? (index: number) => d3ScaleChromatic.interpolateTurbo(
         (data.items.length - index) / data.items.length)
      : (index: number) => d3ScaleChromatic.interpolateTurbo(
         (index + 1) / data.items.length)

   return (
      <AutoSizer>
         {
            ({width, height}) => (
               <PieChart width={width} height={height} className="piechart">
                 <Legend
                    align="right"
                    formatter={legendItem}
                    layout="vertical"
                    verticalAlign="middle"
                 />
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
                   outerRadius="80%"
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
   );
}
export default CategoryPie;
