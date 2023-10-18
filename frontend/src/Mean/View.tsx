import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRange, endOfMonth, toDates } from '@/Dates';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Bar, ReferenceLine,
         Line, Tooltip, TooltipProps, Label } from 'recharts';
import { CommodityId } from '@/services/useAccounts';
import Numeric from '@/Numeric';
import { AccountIdSet } from '@/services/useAccountIds';
import usePrefs from '@/services/usePrefs';
import AutoSizer, { Size } from 'react-virtualized-auto-sizer';
import useFetch from '@/services/useFetch';
import useColors from '@/services/useColors';
import './Mean.scss';

interface PointJSON {
   date: string;
   value_expenses: number;
   average_expenses: number;
   value_realized: number;
   value_networth_delta: number; // how much the networth changed that month
   average_networth_delta: number;
}

interface Point extends PointJSON {
   average_realized: number;
   value_unrealized?: number;
   average_unrealized?: number;
   average_income?: number;
   value_exp: number;
   avg_exp: number;
}

const NO_HISTORY: Point[] = [];

const useMeanHistory = (
   range: DateRange,
   prior: number,
   after: number,
   unrealized: boolean|undefined,
   negateExpenses: boolean|undefined,
   currencyId: CommodityId,
): Point[] => {
   const args = React.useMemo(
      () => {
         // Round the dates so that we always start and end on month
         // boundaries. Otherwise, the graph will only show a subset of all the
         // splits for the start and end bars, which is confusing for users.
         const dates = toDates(range, undefined, true);
         return {
            mindate: dates[0],
            maxdate: dates[1],
            prior,
            after,
            unrealized,
            currency: currencyId,
         };
      },
      [range, prior, after, unrealized, currencyId]
   );

   const { data } = useFetch({
      cmd: 'mean',
      args,
      parse: (data: PointJSON[]): Point[] => data.map(p => {
         const average_realized = 0;
         return {
            ...p,
            average_realized,
            value_unrealized:
               unrealized
               ? p.value_networth_delta
                 - p.value_realized - p.value_expenses
               : 0,
            average_unrealized: undefined,
            average_income:
               unrealized
               ? p.average_networth_delta - p.average_expenses
               : average_realized,
            value_exp: negateExpenses ? -p.value_expenses : p.value_expenses,
            avg_exp: negateExpenses ? -p.average_expenses : p.average_expenses,
         };
      }),
   });

   return data ?? NO_HISTORY;
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
   showRollingMean?: boolean;
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
                        <td>Monthly (realized)</td>
                        <td>
                           <Numeric
                              amount={d.value_realized}
                              commodity={p.currency}
                           />
                       </td>
                     </tr>
                  }
                  {
                     p.props.showUnrealized && p.props.showIncome &&
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
                     p.props.showRollingMean &&
                     <tr>
                        <td>Mean total</td>
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
                           p.props.showRollingMean &&
                           <tr>
                              <td>Mean total</td>
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
   const navigate = useNavigate();
   const colorExpense = useColors(true, 1);
   const colorIncome = useColors(false, 2);

   const clickOnBar = React.useCallback(
      (data: Point, accounts: AccountIdSet) => {
         const d = endOfMonth(0, new Date(data.date));
         navigate(
            `/ledger?accounts=${accounts}`
            + `&date=${d.toISOString()}`
            + `&range=current month`);
      },
      [navigate]
   );

   const meanIncome = React.useMemo(
      () => points === undefined || !p.showMean
          ? undefined
          : points.reduce(
             (total, pt) => total + (pt?.value_realized ?? NaN), 0)
            / points.length,
      [points, p.showMean]
   );

   const meanExpense = React.useMemo(
      () => points === undefined || !p.showMean
          ? undefined
          : -points.reduce(
             (total, pt) => total + (pt?.value_expenses ?? NaN), 0)
            / points.length,
      [points, p.showMean]
   );

   const clickOnExpenses = React.useCallback(
      (data: Point) => clickOnBar(data, 'expenses'),
      [clickOnBar]
   )
   const clickOnRealizedIncome = React.useCallback(
      (data: Point) => clickOnBar(data, 'realized_income'),
      [clickOnBar]
   )
   const clickOnUnrealizedIncome = React.useCallback(
      (data: Point) => clickOnBar(data, 'unrealized_income'),
      [clickOnBar]
   )

   const getBar = (
      key: string, color: string, stackId: string, accounts: AccountIdSet,
   ) => (
      <Bar
         dataKey={key}
         fill={color}
         stroke={color}
         stackId={stackId}
         isAnimationActive={false}
         onClick={
            accounts === 'realized_income' ? clickOnRealizedIncome
            : accounts === 'unrealized_income' ? clickOnUnrealizedIncome
            : clickOnExpenses
         }
      />
   )

   return (
      <div className='meanHistory'>
         <AutoSizer>
         {
            ({width, height}: Size) => (
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
                  <Tooltip
                     content={
                        <CustomTooltip
                           currency={prefs.currencyId}
                           props={p}
                        />
                     }
                  />
                  { p.showIncome &&
                    getBar('value_realized',
                           colorIncome(0),
                           'income',
                           'realized_income') }
                  { p.showUnrealized &&
                    getBar('value_unrealized',
                           colorIncome(1),
                           'income',
                           'unrealized_income') }
                  { p.showExpenses &&
                    getBar('value_exp',
                           colorExpense(0),
                           'expenses',
                           'expenses') }
                  { p.showIncome && p.showRollingMean &&
                    getLine('average_income', colorIncome(0)) }
                  { p.showExpenses && p.showRollingMean &&
                    getLine ('avg_exp', colorExpense(0)) }
                  {
                     p.showMean &&
                     <ReferenceLine
                        ifOverflow="extendDomain"
                        isFront={true}
                        stroke={colorIncome(0)}
                        y={meanIncome}
                     >
                        <Label
                            value={`mean income: ${meanIncome?.toFixed(0)}`}
                            fill="black"
                            position="insideBottomLeft"
                        />
                     </ReferenceLine>
                  }
                  {
                     p.showMean &&
                     <ReferenceLine
                        ifOverflow="extendDomain"
                        isFront={true}
                        stroke={colorExpense(0)}
                        y={meanExpense}
                     >
                        <Label
                            value={`mean expense: ${meanExpense?.toFixed(0)}`}
                            fill="black"
                            position="insideTopLeft"
                        />
                     </ReferenceLine>
                  }
               </ComposedChart>
            )
         }
         </AutoSizer>
      </div>
   );
}
export default Mean;
