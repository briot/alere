import * as React from 'react';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import { SettingsProps } from 'Dashboard/Module';
import { DateRange, DateRangePicker, rangeToHttp, rangeDisplay } from 'Dates';
import { SetHeader } from 'Header';
import { Checkbox, NumberInput } from 'Form';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Area,
         Line, Tooltip } from 'recharts';
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
) => {
   const [points, setPoints] = React.useState<Point[]>([]);

   React.useEffect(
      () => {
         const doFetch = async() => {
            const resp = await window.fetch(
               `/api/mean?${rangeToHttp(range)}&prior=${prior}&after=${after}`
               + `&expenses=${expenses}`
            );
            const data: Point[] = await resp.json();
            setPoints(data);
         }
         doFetch();
      },
      [range, prior, after, expenses]
   );

   return points;
}


interface MeanProps {
   range: DateRange;
   prior: number;
   after: number;
   accountType?: string;
   expenses: boolean;
}
const Mean: React.FC<MeanProps & SetHeader> = p => {
   const { setHeader } = p;
   const points = useMeanHistory(p.range, p.prior, p.after, p.expenses);

   React.useEffect(
      () => setHeader({
         title: `${p.expenses ? 'Expenses' : 'Income'}`
            + ` history ${rangeDisplay(p.range)}`,
      }),
      [setHeader, p.range, p.expenses]
   );

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
                     type="stepAfter"
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

const Settings: React.FC<
   MeanProps & SettingsProps<MeanProps>
> = p => {
   const changeRange = (range: DateRange) => p.setData({ range });
   const changePrior = (prior: number) => p.setData({ prior });
   const changeAfter = (after: number) => p.setData({ after });
   const changeExp   = (expenses: boolean) => p.setData({ expenses });

   return (
      <fieldset>
         <legend>Expenses History</legend>
         <Checkbox
            checked={p.expenses}
            onChange={changeExp}
            text="Show expenses"
         />
         <NumberInput
            value={p.prior}
            text="Months before"
            title="How many months before the date to use, when computing averages"
            onChange={changePrior}
         />
         <NumberInput
            value={p.after}
            text="Months after"
            title="How many months after the date to use, when computing averages"
            onChange={changeAfter}
         />
         {
            !p.excludeFields?.includes("range") &&
            <DateRangePicker
               text="Time period"
               value={p.range || 'forever'}
               onChange={changeRange}
            />
         }
      </fieldset>
   );
}

export interface MeanModuleProps extends MeanProps, BaseProps {
   type: 'mean',
}

const MeanModule: DashboardModule<MeanModuleProps> = {
   Settings,
   Content: Mean,
}
export default MeanModule;
