import * as React from 'react';
import AutoSizer, { Size } from 'react-virtualized-auto-sizer';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Bar, Cell,
   Tooltip, TooltipProps } from 'recharts';
import { useFetchIERanges } from '@/services/useFetchIE';
import { CommodityId, is_expense } from '@/services/useAccounts';
import useAccountIds, { AccountIdSet } from '@/services/useAccountIds';
import { DateRange, rangeDisplay } from '@/Dates';
import usePrefs from '@/services/usePrefs';
import useColors from '@/services/useColors';
import Numeric from '@/Numeric';
import { numComp } from '@/services/utils';
import "./IEHistoryBars.scss";


/**
 * Properties for the view
 */
export interface IEHistoryBarsProps {
   ranges: DateRange[];
   accountIds: AccountIdSet;  // which accounts to show
}

const formatVal = (p: number|string|React.ReactText[]) =>
   (p as number).toFixed(0);

interface Point {
   category: string;
   total: number;  // sum over all ranges, for sorting purposes
   isExpense: boolean;
   [value: string]: string | number | boolean;
}

const CustomTooltip = (
   p: TooltipProps<number, string>
      & {currency: CommodityId; props: IEHistoryBarsProps }
) => {
   const d = p.payload?.[0]?.payload;
   if (!d) {
      return null;
   }

   return d && p.active && (
      <div className="tooltip-base">
         <h5>{d.category}</h5>
         <table>
            <tbody>
            {
               p.props.ranges.map(r => {
                  const txt = rangeDisplay(r).text;
                  return (
                     <tr key={txt}>
                        <th>{txt}</th>
                        <td>
                          <Numeric
                             amount={d[txt]}
                             commodity={p.currency}
                          />
                        </td>
                     </tr>
                  );
               })
            }
            </tbody>
         </table>
      </div>
   );
}

const IEHistoryBars: React.FC<IEHistoryBarsProps> = p => {
   const { prefs } = usePrefs();
   const included = useAccountIds(p.accountIds);
   const included_ids = React.useMemo(
      () => included.accounts.map(a => a.id),
      [included]
   );
   const account_to_data = useFetchIERanges(p.ranges);
   const points: Point[] = React.useMemo(
      () => {
         const r = Object.values(account_to_data)
            .filter(a => included_ids.includes(a.accountId))
            .map(
               a => {
                  const res: Point = {
                     category: a.name,
                     total: 0,
                     isExpense: is_expense(a.account?.kind),
                  };
                  p.ranges.forEach((r, idx) => {
                     const v = isNaN(a.values[idx])
                        ? 0 : Math.abs(a.values[idx]);
                     res[rangeDisplay(r).text] = v;
                     res.total += v;
                  });
                  return res;
               });
         r.sort((a, b) => numComp(b.total, a.total));  // reverse sort
         return r;
      },
      [account_to_data, p.ranges, included_ids]
   );

   const expColor = useColors(true, p.ranges.length);
   const incColor = useColors(false, p.ranges.length);
   const BAR_SIZE = 10;
   const BAR_GAP =  15;

   return (
      <div className='iehistorybars'>
         <AutoSizer>
         {
            ({width, height}: Size) => (
               <ComposedChart
                  width={Math.max(
                     width ?? 0,
                     BAR_GAP * points.length
                     + BAR_SIZE * p.ranges.length * points.length)}
                  height={height}
                  data={points}
                  barGap={0}
                  barCategoryGap={BAR_GAP}
               >
                  <XAxis
                     dataKey="category"
                     hide={false}
                     angle={-45}
                     interval={0}
                     textAnchor="end"
                     height={80}
                  />
                  <YAxis
                     domain={[-10, 'auto']}
                     tickFormatter={formatVal}
                     scale="linear"
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
                  {
                     p.ranges.map((r, idx) =>
                        <Bar
                           key={rangeDisplay(r).text}
                           dataKey={rangeDisplay(r).text}
                           barSize={BAR_SIZE}
                           isAnimationActive={false}
                        >
                           {
                              points.map((pt, pidx) =>
                                 <Cell
                                    key={pidx}
                                    fill={pt.isExpense ? expColor(idx) : incColor(idx)}
                                    stroke={pt.isExpense ?
                                       expColor(0) : incColor(0)}
                                 />
                              )
                           }
                        </Bar>
                     )
                  }
               </ComposedChart>
            )
         }
         </AutoSizer>
      </div>
   );
}
export default IEHistoryBars;
