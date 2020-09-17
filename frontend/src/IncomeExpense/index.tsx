import * as React from 'react';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import { Legend, PieChart, PieLabelRenderProps,
         Pie, Cell, Tooltip, TooltipProps } from 'recharts';
import { DateRange, rangeDisplay, rangeToHttp } from 'Dates';
import { SetHeaderProps } from 'Dashboard/Panel';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from 'Numeric';
import AccountName from 'Account';
import useAccounts, { AccountId, Account } from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import './IncomeExpense.css';

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
           <AccountName
              id={pay.payload.accountId}
              account={pay.payload.account}
           />
           <div>
              <Numeric
                 amount={value}
                 precision={pay.payload.account.pricePrecision}
                 unit={pay.payload.account.currencySymbol}
              />
           </div>
           <Numeric
               amount={value / total * 100}
               unit="%"
           />
       </div>
     ) : null;
};


export interface IncomeExpenseProps {
   expenses: boolean;
   range: DateRange;
}

const IncomeExpense: React.FC<IncomeExpenseProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const [baseData, setBaseData] = React.useState(noData);
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

            // Filter out negative data, which we cannot show in a pie graph
            setBaseData({
               items: d.items.filter(v => v.value > 0),
               mindate: d.mindate,
               maxdate: d.maxdate,
            });
         }
         dofetch();
      },
      [p.expenses, p.range]
   );

   const data: DataType = React.useMemo(
      () => {
         const d = {...baseData};
         d.items.forEach(a => {
            a.account = accounts.getAccount(a.accountId);
            a[NAME_KEY] = a.account?.name;
         });
         return d;
      },
      [accounts, baseData]
   );

   const legendItem = (value: any, entry: any, index?: number) =>
      index === undefined
         ? <span>{value}</span>
         : (
           <span>
              <AccountName
                  id={data.items[index].accountId}
                  account={data.items[index].account}
              />
              &nbsp;(
                  <Numeric
                     amount={data.items[index].value}
                     unit={prefs.currencyId}
                  />
               )
           </span>
         );

   const color = p.expenses
      ? (index: number) => d3ScaleChromatic.interpolateTurbo(
         (data.items.length - index) / data.items.length)
      : (index: number) => d3ScaleChromatic.interpolateTurbo(
         (index + 1) / data.items.length)

   React.useEffect(
      () => setHeader?.(
         `${p.expenses ? 'Expenses' : 'Income'} ${rangeDisplay(p.range)}`
      ),
      [setHeader, p.expenses, p.range]
   );

   return (
      <AutoSizer>
         {
            ({width, height}) => (
               <PieChart
                  width={width}
                  height={height}
                  className="incomeexpense"
               >
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
export default IncomeExpense;
