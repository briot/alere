import * as React from 'react';
import { DateRange, rangeToHttp } from 'Dates';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Area,
         Line, Tooltip } from 'recharts';
import { CommodityId } from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import AutoSizer from 'react-virtualized-auto-sizer';
import './Mean.css';

interface Point {
   date: string;
   value: number;
   average: number;
}

const useMeanHistory = (
   range: DateRange,
   prior: number,
   after: number,
   expenses: boolean,
   currencyId: CommodityId,
) => {
   const [points, setPoints] = React.useState<Point[]>([]);

   React.useEffect(
      () => {
         const doFetch = async() => {
            const resp = await window.fetch(
               `/api/mean?${rangeToHttp(range)}&prior=${prior}&after=${after}`
               + `&expenses=${expenses}&currency=${currencyId}`
            );
            const data: Point[] = await resp.json();
            setPoints(data);
         }
         doFetch();
      },
      [range, prior, after, expenses, currencyId]
   );

   return points;
}


export interface MeanProps {
   range: DateRange;
   prior: number;
   after: number;
   accountType?: string;
   expenses: boolean;
}
const Mean: React.FC<MeanProps> = p => {
   const { prefs } = usePrefs();
   const points = useMeanHistory(
      p.range, p.prior, p.after, p.expenses, prefs.currencyId);

   const formatVal = (p: number|string|React.ReactText[]) =>
      (p as number).toFixed(0);

   return (
      <div className='meanHistory'>
         <AutoSizer>
         {
            ({width, height}) => (
               <ComposedChart
                  width={width}
                  height={height}
                  data={points}
               >
                  <XAxis
                     dataKey="date"
                  />
                  <YAxis
                     domain={['dataMin', 'dataMax']}
                     tickFormatter={formatVal}
                  />
                  <CartesianGrid
                      strokeDasharray="5 5"
                      stroke="var(--cartesian-grid)"
                  />
                  <Tooltip
                     contentStyle={{backgroundColor: "var(--panel-background)"}}
                     formatter={formatVal}
                  />
                  <Area
                     type="step"
                     dataKey="value"
                     fill="var(--area-chart-fill)"
                     stroke="var(--area-chart-stroke)"
                     isAnimationActive={false}
                  />
                  <Line
                     type="linear"
                     dataKey="average"
                     stroke="var(--color-500)"
                     isAnimationActive={false}
                     dot={false}
                  />
               </ComposedChart>
            )
         }
         </AutoSizer>
      </div>
   );
}
export default Mean;
