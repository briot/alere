import * as React from 'react';
import * as d3Array from 'd3-array';
import { DateRange, rangeToHttp, dateToDate } from '@/Dates';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Bar,
         Tooltip, TooltipProps } from 'recharts';
import { CommodityId } from '@/services/useAccounts';
import Numeric from '@/Numeric';
import usePrefs from '@/services/usePrefs';
import useFetch from '@/services/useFetch';
import AutoSizer from 'react-virtualized-auto-sizer';
import './NetworthHistory.scss';

interface Point {
   date: string;
   networth: number;
   parsedDate: Date;
}
const noPoint: Point = {date: "", networth: NaN, parsedDate: new Date()};

const bisectDate = d3Array.bisector((p: Point) => p.parsedDate).right;

const useNetworthHistory = (
   range: DateRange,
   currencyId: CommodityId,
) => {
   const { data } = useFetch<Point[], any>({
      url: `/api/networth_history?${rangeToHttp(range)}`
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
   const points = useNetworthHistory(p.range, prefs.currencyId);

   const now = points.length ? points[points.length - 1] : noPoint;
   const ago1year: Point|undefined = p.hideLegend
      ? noPoint
      : points[bisectDate(points, dateToDate("1 year ago"))];
   const ago3months: Point|undefined = p.hideLegend
      ? noPoint
      : points[bisectDate(points, dateToDate("3 months ago"))];

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
      () => tooltip(ago1year),
      [ago1year, tooltip]
   );
   const ago3monthsTooltip = React.useCallback(
      () => tooltip(ago3months),
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
               <span>
                  1 year:
                  <Numeric
                     amount={now?.networth - ago1year?.networth}
                     commodity={prefs.currencyId}
                     colored={true}
                     forceSign={true}
                     tooltip={ago1yearTooltip}
                  />
               </span>
               <span>
                  3 months:
                  <Numeric
                     amount={now?.networth - ago3months?.networth}
                     commodity={prefs.currencyId}
                     colored={true}
                     forceSign={true}
                     tooltip={ago3monthsTooltip}
                  />
               </span>
            </div>
         }
      </div>
   );
}
export default NetworthHistory;
