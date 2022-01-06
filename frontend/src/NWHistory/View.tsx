import * as React from 'react';
import * as d3Array from 'd3-array';
import { DateRange, RelativeDate, rangeToHttp, dateToDate } from '@/Dates';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Bar,
         Tooltip, TooltipProps } from 'recharts';
import { CommodityId } from '@/services/useAccounts';
import Numeric from '@/Numeric';
import usePrefs from '@/services/usePrefs';
import useFetch from '@/services/useFetch';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Option } from '@/Form';
import './NetworthHistory.scss';

export type GroupBy = 'months' | 'days';
export const groupByOptions: Option<GroupBy>[] = [
   {value: 'days'},
   {value: 'months'},
];


interface Point {
   date: string;
   networth: number;
   parsedDate: Date;
}
const noPoint: Point = {date: "", networth: NaN, parsedDate: new Date()};

const bisectDate = d3Array.bisector((p: Point) => p.parsedDate).left;

const useNetworthHistory = (
   range: DateRange,
   groupBy: GroupBy,
   currencyId: CommodityId,
) => {
   const { data } = useFetch<Point[], any>({
      url: `/api/networth_history?${rangeToHttp(range)}`
         + `&groupby=${groupBy}`
         + `&currency=${currencyId}`,
   });
   return React.useMemo(
      () => data
         ? data.map(d => ({ ...d, parsedDate: new Date(d.date) }))
         : [],
      [data]
   );
}

export interface NetworthHistoryProps {
   range: DateRange;
   hideLegend?: boolean;
   groupBy?: GroupBy;
}

const formatVal = (p: number|string|React.ReactText[]) =>
   (p as number).toFixed(0);

const CustomTooltip = (
   p: TooltipProps<number, string> & {currency: CommodityId, props: NetworthHistoryProps}
) => {
   const d = p.payload?.[0]?.payload;
   if (!d) {
      return null;
   }

   return d && p.active
      ? (
         <div className="tooltip-base">
            <h5>{d.date}</h5>
            <Numeric
               amount={d.networth}
               commodity={p.currency}
            />
         </div>
      )
      : null;
}

const NetworthHistory: React.FC<NetworthHistoryProps> = p => {
   const { prefs } = usePrefs();
   const points = useNetworthHistory(
      p.range, p.groupBy ?? 'months', prefs.currencyId);

   const now = points.length ? points[points.length - 1] : noPoint;

   // Return the point to use, assuming we have the information
   const getOld = (when: RelativeDate) => {
      const d = dateToDate(when);
      const idx = p.hideLegend ? NaN : bisectDate(points, d);
      const pt = isNaN (idx) ? undefined : points[idx];
      if (idx > 0 || !pt) {
         return pt;
      }
      return d >= pt.parsedDate ? pt : undefined;
   }
   const ago1year = getOld("1 year ago");
   const ago3months = getOld("3 months ago");

   const tooltip = React.useCallback(
      (v: Point) => (
         <div className="tooltip-base">
            <table>
               <tr>
                  <th>{v.date}</th>
                  <td>
                     <Numeric
                        amount={v.networth}
                        commodity={prefs.currencyId}
                     />
                  </td>
               </tr>
               <tr>
                  <th>{now?.date}</th>
                  <td>
                     <Numeric
                        amount={now?.networth}
                        commodity={prefs.currencyId}
                     />
                  </td>
               </tr>
            </table>
         </div>
      ),
      [now, prefs.currencyId]
   );

   const ago1yearTooltip = React.useCallback(
      () => ago1year && tooltip(ago1year),
      [ago1year, tooltip]
   );
   const ago3monthsTooltip = React.useCallback(
      () => ago3months && tooltip(ago3months),
      [ago3months, tooltip]
   );

   return (
      <div className='networthHistory'>
         <div>
            <AutoSizer>
            {
               ({width, height}) => (
                  <ComposedChart
                     width={width}
                     height={height}
                     data={points}
                     barGap={0}
                     barCategoryGap="10%"
                  >
                     <XAxis
                        dataKey="date"
                     />
                     <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={formatVal}
                     />
                     <CartesianGrid
                         strokeDasharray="5 5"
                     />
                     <Tooltip
                        content={
                           <CustomTooltip
                              currency={prefs.currencyId}
                              props={p}
                           />
                        }
                     />
                     <Bar
                        dataKey="networth"
                        fill="var(--graph-networth)"
                        stroke="var(--graph-networth"
                        isAnimationActive={false}
                     />
                  </ComposedChart>
               )
            }
            </AutoSizer>
         </div>
         {
            !p.hideLegend &&
            <div className="pastNW">
               {
                  ago1year &&
                  <span>
                     1 year:
                     <Numeric
                        amount={now.networth - ago1year.networth}
                        commodity={prefs.currencyId}
                        colored={true}
                        forceSign={true}
                        tooltip={ago1yearTooltip}
                     />
                  </span>
               }
               {
                  ago3months &&
                  <span>
                     3 months:
                     <Numeric
                        amount={now.networth - ago3months.networth}
                        commodity={prefs.currencyId}
                        colored={true}
                        forceSign={true}
                        tooltip={ago3monthsTooltip}
                     />
                  </span>
               }
            </div>
         }
      </div>
   );
}
export default NetworthHistory;
