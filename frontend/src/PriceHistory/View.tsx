import React from 'react';
import { Account } from 'services/useAccounts';
import * as d3TimeFormat from 'd3-time-format';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Area,
         ReferenceArea, Line, Tooltip, Legend } from 'recharts';
import { Transaction } from 'Transaction';
import AutoSizer from 'react-virtualized-auto-sizer';
import usePrefs from 'services/usePrefs';
import useFetchPrices from 'services/useFetchPrices';
import RoundButton from 'RoundButton'
import { DateRange } from 'Dates';
import { AccountIdSet } from 'services/useAccountIds';
import './PriceHistory.scss';

interface Holding {
   date: number;
   price: number;
   holding: number;
   position: number;
}

type AlrAxisDomainItem = string | number | ((x: number)=>number);

interface State {
   xmin: number|string,
   xmax: number|string,
   refAreaLeft?: number|undefined,
   refAreaRight?: number|undefined,
   priceRange: [AlrAxisDomainItem, AlrAxisDomainItem],
   posRange: [AlrAxisDomainItem, AlrAxisDomainItem],
   holdRange: [AlrAxisDomainItem, AlrAxisDomainItem],
}
const nullState: State = {
   xmin: 'dataMin',
   xmax: 'dataMax',
   priceRange: [min => min * 0.99, max => max * 1.01],
   posRange: [min => min * 0.99, max => max * 1.01],
   holdRange: [min => min * 0.95, max => max * 1.05],
}

export interface PriceHistoryProps {
   accountIds: AccountIdSet;    // must have exactly one element
   transactions: Transaction[];
   range: DateRange;
   hidePositions?: boolean;
   hidePrices?: boolean;
   hideHoldings?: boolean;
}
interface ExtraProps {
   account: Account;
}

const PriceHistory: React.FC<PriceHistoryProps & ExtraProps> = p => {
   const { prefs } = usePrefs();
   const prices = useFetchPrices(p.account.id, prefs.currencyId);
   const [data, setData] = React.useState<Holding[]>([]);
   const [state, setState] = React.useState(nullState);

   const onMouseDown = React.useCallback(
      (e) => setState(old => ({...old, refAreaLeft: e.activeLabel })),
      []
   );
   const onMouseMove = React.useCallback(
      (e) => setState(old =>
         old.refAreaLeft ? { ...old, refAreaRight: e.activeLabel } : old
      ),
      []
   );

   const onMouseUp = React.useCallback(
      () => setState(state => {
         const { refAreaLeft, refAreaRight } = state;
         if ( refAreaLeft === refAreaRight || refAreaRight === undefined ) {
            return {
               ...state,
               refAreaLeft: undefined,
               refAreaRight: undefined,
            };
         }
         const l = Math.min(refAreaLeft as number);   // timestamp
         const r = Math.max(refAreaRight as number);  // timestamp
         const l_idx = data.map(h => h.date).indexOf(l);
         const r_idx = data.map(h => h.date).indexOf(r);
         const slice = data.slice(l_idx, r_idx + 1);
         const priceMin = Math.min.apply(null, slice.map(h => h.price));
         const priceMax = Math.max.apply(null, slice.map(h => h.price));
         const posMin   = Math.min.apply(null, slice.map(h => h.position));
         const posMax   = Math.max.apply(null, slice.map(h => h.position));
         const holdMin  = Math.min.apply(null, slice.map(h => h.holding));
         const holdMax  = Math.max.apply(null, slice.map(h => h.holding));
         return {
            refAreaLeft: undefined,
            refAreaRight: undefined,
            xmin: l,
            xmax: r,
            priceRange: [priceMin, priceMax],
            posRange: [Math.min(0, posMin), Math.max(0, posMax)],
            holdRange: [holdMin, holdMax],
         };
      }),
      [data]
   );

   const zoomOut = React.useCallback(
      () => setState(state => nullState),
      []
   );

   React.useEffect(
      () => {
         const merged: Holding[] = [];
         const merge = (d_idx: number, t_idx: number) => {
            const pr = prices[d_idx];
            const tr = p.transactions[t_idx];
            const position = tr?.balanceShares ?? 0
            const price    = pr?.price ?? 0;
            merged.push({
               date: new Date((pr ?? tr).date).getTime(),
               price,
               position,
               holding: position * price,
            });
         };

         let d_idx = 0;
         let t_idx = 0;
         while (1) {
            if (d_idx >= prices.length) {
               if (t_idx >= p.transactions.length) {
                  break;
               }
               merge(d_idx - 1, t_idx++);
            } else if (t_idx >= p.transactions.length) {
               merge(d_idx++, t_idx - 1);
            } else if (prices[d_idx].date === p.transactions[t_idx].date) {
               merge(d_idx++, t_idx++);
            } else if (prices[d_idx].date < p.transactions[t_idx].date) {
               merge(d_idx++, t_idx - 1);
            } else {
               merge(d_idx - 1, t_idx++);
            }
         }
         setData(merged);
      },
      [prices, p.transactions]
   );

   const showPrices = prices.length > 0 && !p.hidePrices;
   const showHoldings = prices.length > 0 && !p.hideHoldings;
   const showPositions = !p.hidePositions;

   if (!showPrices && !showHoldings && !showPositions) {
      return null;
   }

   const dateForm = d3TimeFormat.timeFormat("%Y-%m-%d");
   const labelForm = (d: number|string) =>
      <span>{dateForm(new Date(d))}</span>;

   return (
      <div className='priceHistory' title="Select a region to zoom">
         {
            state.xmin !== "dataMin" &&
            <RoundButton
               fa="fa-search-minus"
               title="Reset zoom level"
               onClick={zoomOut}
               size="small"
            />
         }
         <AutoSizer>
            {
               ({width, height}) => (
                  <ComposedChart
                     width={width}
                     height={height}
                     data={data}
                     onMouseDown={onMouseDown}
                     onMouseMove={onMouseMove}
                     onMouseUp={onMouseUp}
                  >
                     <XAxis
                         allowDataOverflow={true}
                         dataKey="date"
                         domain={[state.xmin, state.xmax]}
                         scale="time"
                         type="number"
                         tickFormatter={dateForm}
                      />
                     <CartesianGrid
                         strokeDasharray="5 5"
                         stroke="var(--cartesian-grid)"
                     />
                     <Tooltip
                         labelFormatter={labelForm}
                         contentStyle={{backgroundColor: "var(--panel-background)"}}

                     />

                     <Legend />
                     {
                        showPositions &&
                        <YAxis
                            yAxisId="leftPos"
                            allowDataOverflow={true}
                            hide={true}
                            domain={state.posRange}
                        />
                     }
                     {
                        showPositions &&
                        <Area
                            type="stepAfter"
                            dataKey="position"
                            legendType="square"
                            fill="var(--color-500-20p)"
                            stroke="var(--color-400)"
                            isAnimationActive={false}
                            yAxisId="leftPos"
                        />
                     }

                     {
                        showPrices &&
                        <YAxis
                            yAxisId="left"
                            allowDataOverflow={true}
                            domain={state.priceRange}
                        />
                     }
                     {
                        showPrices &&
                        <Line
                            type="linear"
                            dataKey="price"
                            name="price"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--color-500)"
                            yAxisId="left"
                            dot={false}
                        />
                     }

                     {
                        showHoldings &&
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            allowDataOverflow={true}
                            domain={state.holdRange}
                        />
                     }
                     {
                        showHoldings &&
                        <Line
                            type="linear"
                            dataKey="holding"
                            name="holdings"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--color-900)"
                            yAxisId="right"
                            dot={false}
                        />
                     }

                     {
                        (state.refAreaLeft && state.refAreaRight) &&
                        <ReferenceArea
                           yAxisId={
                              showPrices ? "left"
                              : showHoldings ? "right"
                              : "leftPos"
                           }
                           x1={state.refAreaLeft}
                           x2={state.refAreaRight}
                           strokeOpacity={0.3}
                        />
                     }
                  </ComposedChart>
               )
            }
         </AutoSizer>
      </div>
   );
}

export default PriceHistory;
