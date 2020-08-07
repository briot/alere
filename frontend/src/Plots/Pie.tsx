import * as React from 'react';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import { Legend, PieChart, PieLabelRenderProps,
         Pie, Cell, Tooltip, TooltipProps } from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';
import Numeric from 'Numeric';
import './Pie.css';

interface DataItemType {
   name: string;
   value: number;
}
interface DataType {
   items:   DataItemType[];
   mindate: string;
   maxdate: string;
}
const noData: DataType = {items: [], mindate: '', maxdate: ''};

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
   const label = pay.name;
   const value = pay.value as number;
   const total = p.data.items.reduce((t, d) => t + d.value, 0);
   return p.active
     ? (
       <div className="customTooltip" >
           <div>{label}</div>
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


interface PiePlotProps {
   expenses: boolean;
   mindate?: string;
   maxdate?: string;
}

const PiePlot: React.FC<PiePlotProps> = p => {
   const [data, setData] = React.useState(noData);

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch(
               `/api/plots/category/${p.expenses ? 'expenses' : 'income'}`
               + `?mindate=${p.mindate || ''}`
               + `&maxdate=${p.maxdate || ''}`
            );
            const d: DataType = await resp.json();

            // Filter out negative data, which we cannot show in a pie graph
            setData({
               items: d.items.filter(v => v.value > 0),
               mindate: d.mindate,
               maxdate: d.maxdate,
            });
         }
         dofetch();
      },
      [p.expenses, p.mindate, p.maxdate]
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
export default PiePlot;