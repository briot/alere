import * as React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ComposedChart, XAxis, YAxis, Area, Tooltip, Line, Legend,
         ReferenceArea,
         ReferenceLine, TooltipProps } from 'recharts';
import { CommodityId } from '@/services/useAccounts';
import { dateForm, isNumeric } from '@/services/utils';
import RoundButton from '@/RoundButton';
import Numeric from '@/Numeric';
import usePrefs from '@/services/usePrefs';
import './PriceGraph.scss';

const priceForm = (v: number) => v.toFixed(2);

export type ClosePrice = {
   t: number;      // timestamp
   price: number;  // price
   roi: number;    // return-on-investment, as percent
   shares: number; // number of shares owned
   hold?: number;
};

type AlrAxisDomainItem = string | number | ((x: number)=>number);

const baseDomain: [AlrAxisDomainItem, AlrAxisDomainItem] =
   [x => x * 0.95, x => x * 1.05];

interface State {
   xmin: number|string,
   xmax: number|string,
   refAreaLeft?: number|undefined,
   refAreaRight?: number|undefined,
}
const nullState: State = {
   xmin: 'dataMin',
   xmax: 'dataMax',
}

export interface PriceGraphProps {
   children?: React.ReactNode;
   commodity_id: CommodityId;  //  commodity for shares
   prices: ClosePrice[];
   dateRange: [Date, Date];
   weighted_avg?: number;
   avg_cost?: number;
   showWeightedAverage?: boolean;
   showAverageCost?: boolean;
   showROI?: boolean;
   showPrice: boolean;
   showShares?: boolean;
   showHolding?: boolean;
   showLegend?: boolean;
}

const PriceGraph = (p: PriceGraphProps) => {
   const [state, setState] = React.useState(nullState);

   const CustomTooltip: React.FC<TooltipProps<any, number>> = d => {
     const { prefs } = usePrefs();
     if (d.active && d.payload && d.payload.length) {
        const data: ClosePrice = d.payload[0].payload;
        return (
           <div className="tooltip-base">
              <p className="label">
                 { dateForm(new Date(data.t)) }
              </p>
              <table>
                 <tbody>
                    <tr>
                       <th>Price</th>
                       <td>
                          <Numeric
                             amount={data.price}
                             commodity={prefs.currencyId}
                          />
                      </td>
                    </tr>
                    <tr>
                       <th>Return</th>
                       <td>
                          <Numeric
                             amount={data.roi}
                             forceSign={true}
                             showArrow={true}
                             suffix='%'
                          />
                      </td>
                    </tr>
                    <tr>
                       <th>Shares</th>
                       <td>
                          <Numeric
                             amount={data.shares}
                             commodity={p.commodity_id}
                          />
                      </td>
                    </tr>
                    <tr>
                       <th>Holdings</th>
                       <td>
                          <Numeric
                             amount={data.shares * data.price}
                             commodity={prefs.currencyId}
                          />
                      </td>
                    </tr>
                 </tbody>
              </table>
           </div>
        );
     }
      return null;
   };

   const xrange = p.dateRange.map(d => d.getTime()) as [number, number];
   const hist =
      (isNumeric(state.xmin)
         ? p.prices
              .filter(r => r.t >= state.xmin && r.t <= state.xmax
                           && r.price !== null)
         : p.prices
              .filter(r => r.t >= xrange[0] && r.t <= xrange[1]
                           && r.price !== null)
      );

   if (p.showHolding) {
      hist.forEach(p => {p.hold = p.shares * p.price});
   }

   const onMouseDown = React.useCallback(
      (e: {activeLabel?: string}) =>
         setState(old => ({
            ...old,
            refAreaLeft: parseInt(e.activeLabel ?? '')
         })),
      []
   );
   const onMouseMove = React.useCallback(
      (e: {activeLabel?: string}) => setState(old =>
         old.refAreaLeft
         ? { ...old, refAreaRight: parseInt(e.activeLabel ?? '') }
         : old
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
         return {
            refAreaLeft: undefined,
            refAreaRight: undefined,
            xmin: l,
            xmax: r,
         };
      }),
      []
   );

   const zoomOut = React.useCallback(
      () => setState(state => nullState),
      []
   );

   if (!hist.length) {
      return null;
   }

   return (
      <div className="priceGraph">
         <AutoSizer>
            {
               ({width, height}) => (
                 <ComposedChart
                    width={width}
                    height={height}
                    data={hist}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                 >
                     <defs>
                       <linearGradient id="priceG" x1="0" y1="0" x2="0" y2="1">
                         <stop
                            offset="5%"
                            stopColor="var(--graph-price)"
                            stopOpacity={0.5}
                         />
                         <stop
                            offset="95%"
                            stopColor="var(--graph-price)"
                            stopOpacity={0.1}
                         />
                       </linearGradient>
                     </defs>
                     <XAxis
                         dataKey="t"
                         scale="time"
                         type="number"
                         angle={0}
                         ticks={hist.length > 1
                            ? [hist[0].t, hist[hist.length - 1].t]
                            : undefined}
                         domain={[state.xmin, state.xmax]}
                         tickFormatter={dateForm}
                     />
                     <Tooltip
                         content={CustomTooltip}
                         allowEscapeViewBox={{x: true, y: true}}
                         isAnimationActive={false}
                     />
                     {/*
                     <CartesianGrid
                         strokeDasharray="5 5"
                     />
                     */}
                     {
                        p.showLegend &&
                        <Legend />
                     }
                     {
                        p.showPrice &&
                        <YAxis
                            dataKey="price"
                            type="number"
                            yAxisId={0}
                            domain={baseDomain}
                            hide={hist.length === 0}
                            orientation="right"
                            stroke="var(--graph-price)"
                            tickFormatter={priceForm}
                            width={30}
                        >
                           {/*
                           <Label
                              position="right"
                              angle={270}
                              offset={0}
                              style={{ fontSize: 10, textAnchor: 'middle'}}
                           >
                              Price
                           </Label>
                           */}
                        </YAxis>
                     }
                     {
                        p.showPrice &&
                        <Area
                            type="linear"
                            dataKey="price"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--graph-price)"
                            fill="url(#priceG)"
                            dot={false}
                            yAxisId={0}
                        />
                     }
                     {
                        p.showPrice &&
                        p.showWeightedAverage &&
                        p.weighted_avg &&
                        <ReferenceLine
                            y={p.weighted_avg}
                            stroke="var(--graph-price)"
                            strokeDasharray="3 3"
                            isFront={true}
                        />
                     }
                     {
                        p.showPrice &&
                        p.showAverageCost &&
                        p.avg_cost &&
                        <ReferenceLine
                            y={p.avg_cost}
                            stroke="var(--graph-price)"
                            strokeDasharray="3 3"
                            isFront={true}
                        />
                     }
                     {
                        p.showShares &&
                        hist.length !== 0 &&
                        <YAxis
                            dataKey="shares"
                            yAxisId="shares"
                            type="number"
                            domain={baseDomain}
                            hide={p.showPrice}
                            orientation="right"
                            stroke="var(--graph-shares)"
                            width={30}
                            tickFormatter={priceForm}
                        />
                        }
                     {
                        p.showShares &&
                        hist.length !== 0 &&
                        <Line
                            type="linear"
                            dataKey="shares"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--graph-shares)"
                            dot={false}
                            yAxisId="shares"
                        />
                     }
                     {
                        p.showHolding &&
                        hist.length !== 0 &&
                        <YAxis
                            dataKey="hold"
                            yAxisId="hold"
                            type="number"
                            domain={baseDomain}
                            hide={p.showPrice || p.showShares}
                            orientation="right"
                            stroke="var(--graph-holding)"
                            width={30}
                            tickFormatter={priceForm}
                        />
                        }
                     {
                        p.showHolding &&
                        hist.length !== 0 &&
                        <Line
                            type="linear"
                            dataKey="hold"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--graph-holding)"
                            dot={false}
                            yAxisId="hold"
                        />
                     }
                     {
                        p.showROI &&
                        hist.length !== 0 &&
                        <YAxis
                            dataKey="roi"
                            yAxisId="roi"
                            type="number"
                            domain={["auto", "auto"]}
                            orientation="left"
                            stroke="var(--graph-roi)"
                            width={30}
                            tickFormatter={priceForm}
                        >
                           {/*
                           <Label
                              position="left"
                              angle={270}
                              offset={0}
                              style={{ fontSize: 10, textAnchor: 'middle'}}
                           >
                              ROI
                           </Label>
                           */}
                        </YAxis>
                     }
                     {
                        p.showROI &&
                        hist.length !== 0 &&
                        <Line
                            type="linear"
                            dataKey="roi"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--graph-roi)"
                            dot={false}
                            yAxisId="roi"
                        />
                     }
                     {
                        (state.refAreaLeft && state.refAreaRight) &&
                        <ReferenceArea
                           yAxisId={
                              p.showPrice ? 0
                              : p.showHolding ? "hold"
                              : "roi"
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
         {
            isNumeric(state.xmin) &&
            <RoundButton
               fa="fa-search-minus"
               tooltip="Reset zoom level"
               onClick={zoomOut}
               size="small"
            />
         }
      </div>
   );
}

export default PriceGraph;
