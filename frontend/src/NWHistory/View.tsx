import * as React from 'react';
import { DateRange, rangeToHttp } from 'Dates';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Bar,
         Tooltip, TooltipProps } from 'recharts';
import { CommodityId } from 'services/useAccounts';
import Numeric from 'Numeric';
import usePrefs from 'services/usePrefs';
import AutoSizer from 'react-virtualized-auto-sizer';
import './NetworthHistory.scss';

interface Point {
   date: string;
   networth: number;
}

const useNetworthHistory = (
   range: DateRange,
   prior: number,
   after: number,
   currencyId: CommodityId,
) => {
   const [points, setPoints] = React.useState<Point[]>([]);
   React.useEffect(
      () => {
         const doFetch = async() => {
            const resp = await window.fetch(
               `/api/networth_history?${rangeToHttp(range)}`
               + `&prior=${prior}&after=${after}&currency=${currencyId}`
            );
            const data: Point[] = await resp.json();
            setPoints(data);
         }
         doFetch();
      },
      [range, prior, after, currencyId]
   );

   return points;
}

export interface NetworthHistoryProps {
   range: DateRange;
   prior: number;
   after: number;
}

const formatVal = (p: number|string|React.ReactText[]) =>
   (p as number).toFixed(0);

const CustomTooltip = (
   p: TooltipProps & {currency: CommodityId, props: NetworthHistoryProps}
) => {
   const d = p.payload?.[0]?.payload;
   if (!d) {
      return null;
   }

   return d && p.active
      ? (
         <div className="customTooltip">
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
      p.range, p.prior, p.after, prefs.currencyId);

   return (
      <div className='networthHistory'>
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
                      stroke="var(--cartesian-grid)"
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
                     fill="var(--positive-fg)"
                     stroke="var(--positive-fg-border"
                     isAnimationActive={false}
                  />
               </ComposedChart>
            )
         }
         </AutoSizer>
      </div>
   );
}
export default NetworthHistory;
