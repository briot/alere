import * as React from 'react';
import { DateRange, rangeToHttp } from '@/Dates';
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
}

const useNetworthHistory = (
   range: DateRange,
   currencyId: CommodityId,
) => {
   const { data } = useFetch<Point[], any>({
      url: `/api/networth_history?${rangeToHttp(range)}`
         + `&currency=${currencyId}`,
   });
   return data;
}

export interface NetworthHistoryProps {
   range: DateRange;
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
   );
}
export default NetworthHistory;
