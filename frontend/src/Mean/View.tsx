import * as React from 'react';
import { DateRange, rangeToHttp } from '@/Dates';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Bar, ReferenceLine,
         Line, Tooltip, TooltipProps } from 'recharts';
import { CommodityId } from '@/services/useAccounts';
import Numeric from '@/Numeric';
import usePrefs from '@/services/usePrefs';
import AutoSizer from 'react-virtualized-auto-sizer';
import useFetch from '@/services/useFetch';
import './Mean.scss';

interface Point {
   date: string;
   value_expenses?: number;
   average_expenses?: number;

   value_realized?: number;
   average_realized?: number;

   value_networth_delta?: number;
   average_networth_delta?: number;

   average_income?: number; // computed on the client
   value_unrealized?: number; // computed on the client
   value_exp?: number;        // computed on the client
   avg_exp?: number;          // computed on the client
}

const useMeanHistory = (
   range: DateRange,
   prior: number,
   after: number,
   unrealized: boolean|undefined,
   negateExpenses: boolean|undefined,
   currencyId: CommodityId,
) => {
   const { data } = useFetch<Point[], Point[]>({
      url: `/api/mean?${rangeToHttp(range)}&prior=${prior}&after=${after}`
         + `&unrealized=${unrealized}&currency=${currencyId}`,
      parse: (data: Point[]) => {
         data.forEach(p => {
            if (unrealized) {
               p.value_unrealized = (p.value_networth_delta || 0)
                  - (p.value_realized || 0)
                  - (p.value_expenses || 0)
               p.average_income = (p.average_networth_delta || 0)
                  - (p.average_expenses || 0);
            } else {
               p.average_income = (p.average_realized || 0);
            }

            if (negateExpenses) {
               p.value_exp = -(p.value_expenses || 0);
               p.avg_exp = -(p.average_expenses || 0);
            } else {
               p.value_exp = p.value_expenses || 0;
               p.avg_exp = p.average_expenses || 0;
            }
         });
         return data;
      },
   });

   return data;
}

export interface MeanProps {
   range: DateRange;
   prior: number;
   after: number;
   accountType?: string;
   showExpenses?: boolean;
   showIncome?: boolean;
   showUnrealized?: boolean;
   negateExpenses?: boolean;
   showMean?: boolean;
}

const formatVal = (p: number|string|React.ReactText[]) =>
   (p as number).toFixed(0);

const CustomTooltip = (
   p: TooltipProps<number, string> & {currency: CommodityId, props: MeanProps}
) => {
   const d = p.payload?.[0]?.payload;
   if (!d) {
      return null;
   }

   return d && p.active
      ? (
         <div className="tooltip-base">
            <h5>{d.date}</h5>
            <table>
               <tbody>
                  {
                     (p.props.showIncome || p.props.showUnrealized) &&
                     <tr>
                        <th colSpan={2}>Income</th>
                     </tr>
                  }
                  {
                     p.props.showIncome &&
                     <tr>
                        <td>Monthly</td>
                        <td>
                           <Numeric
                              amount={d.value_realized}
                              commodity={p.currency}
                           />
                       </td>
                     </tr>
                  }
                  {
                     p.props.showUnrealized &&
                     <tr>
                        <td>Stocks, real-estate,.. (unrealized)</td>
                        <td>
                           <Numeric
                              amount={d.value_unrealized}
                              commodity={p.currency}
                           />
                       </td>
                     </tr>
                  }
                  {
                     p.props.showUnrealized && p.props.showIncome &&
                     <tr>
                        <td>Total</td>
                        <td>
                           <Numeric
                              amount={d.value_realized
                                 + (d.value_unrealized || 0)}
                              commodity={p.currency}
                           />
                       </td>
                     </tr>
                  }
                  {
                     p.props.showMean &&
                     <tr>
                        <td>Average total</td>
                        <td>
                           <Numeric
                              amount={d.average_income}
                              commodity={p.currency}
                           />
                       </td>
                     </tr>
                  }
                  {
                     p.props.showExpenses &&
                     <>
                        <tr>
                           <th colSpan={2}>Expenses</th>
                        </tr>
                        <tr>
                           <td>Monthly</td>
                           <td>
                              <Numeric
                                 amount={d.value_expenses}
                                 commodity={p.currency}
                              />
                          </td>
                        </tr>
                        {
                           p.props.showMean &&
                           <tr>
                              <td>Average total</td>
                              <td>
                                 <Numeric
                                    amount={d.average_expenses}
                                    commodity={p.currency}
                                 />
                             </td>
                           </tr>
                        }
                     </>
                  }
               </tbody>
            </table>
         </div>
      )
      : null;
}

const getArea = (key: string, color: string, stackId: string,
) => (
   <Bar
      dataKey={key}
      fill={color}
      stroke={color}
      stackId={stackId}
      isAnimationActive={false}
   />
)

const getLine = (key: string, color: string) => (
   <Line
      type="linear"
      dataKey={key}
      stroke={color}
      isAnimationActive={false}
      dot={false}
   />
)

const Mean: React.FC<MeanProps> = p => {
   const { prefs } = usePrefs();
   const points = useMeanHistory(
      p.range, p.prior, p.after,
      p.showUnrealized, p.negateExpenses, prefs.currencyId);

   return (
      <div className='meanHistory'>
         <AutoSizer>
         {
            ({width, height}) => (
               <ComposedChart
                  width={width}
                  height={height}
                  data={points}
                  barGap={0}
                  barCategoryGap={
                     p.showExpenses && p.showIncome
                     ? "10%"
                     : 0
                  }
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
                  <ReferenceLine
                     ifOverflow="extendDomain"
                     isFront={false}
                     y={9}
                  />
                  <Tooltip
                     content={
                        <CustomTooltip
                           currency={prefs.currencyId}
                           props={p}
                        />
                     }
                  />
                  { p.showIncome &&
                    getArea('value_realized',
                            'var(--graph-mean-realized)',
                            'income') }
                  { p.showUnrealized &&
                    getArea('value_unrealized',
                            'var(--graph-mean-unrealized)',
                            'income') }
                  { p.showExpenses &&
                    getArea('value_exp',
                            'var(--graph-mean-expenses)',
                            'expenses') }
                  { p.showIncome && p.showMean &&
                    getLine('average_income', 'var(--graph-mean-realized)') }
                  { p.showExpenses && p.showMean &&
                    getLine ('avg_exp', 'var(--graph-mean-expenses)') }
               </ComposedChart>
            )
         }
         </AutoSizer>
      </div>
   );
}
export default Mean;
