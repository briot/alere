import AutoSizer from 'react-virtualized-auto-sizer';
import { ComposedChart, XAxis, YAxis, Area, Tooltip, Line,
         ReferenceLine, TooltipProps } from 'recharts';
import { AccountForTicker, ClosePrice, Ticker } from 'Ticker/types';
import { dateForm } from 'services/utils';
import Numeric from 'Numeric';
import usePrefs from 'services/usePrefs';

const priceForm = (v: number) => v.toFixed(2);

interface HistoryProps {
   ticker: Ticker;
   acc: AccountForTicker;
   dateRange: [Date, Date];
   showWALine?: boolean;
   showACLine?: boolean;
   showROIGraph: boolean;
   showPriceGraph: boolean;
}

const History: React.FC<HistoryProps> = p => {
   const xrange = p.dateRange.map(d => d.getTime()) as [number, number];
   const hist =
      p.acc.prices
      .filter(r => r.t >= xrange[0] && r.t <= xrange[1] && r.price !== null);

   const CustomTooltip: React.FC<TooltipProps<any, number>> = d => {
     const { prefs } = usePrefs();
     if (d.active && d.payload && d.payload.length) {
        const data: ClosePrice = d.payload[0].payload;
        return (
           <div className="graph-tooltip">
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
                             colored={true}
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
                             commodity={p.ticker.id}
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

   return (
      <div className="hist" title={`Prices from ${p.ticker.source}`}>
         <AutoSizer>
            {
               ({width, height}) => (
                 <ComposedChart
                    width={width}
                    height={height}
                    data={hist}
                 >
                     <defs>
                       <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                         <stop
                            offset="5%"
                            stopColor="var(--ticker-history)"
                            stopOpacity={0.5}
                         />
                         <stop
                            offset="95%"
                            stopColor="var(--ticker-history)"
                            stopOpacity={0.1}
                         />
                       </linearGradient>
                     </defs>
                     <XAxis
                         dataKey="t"
                         scale="time"
                         type="number"
                         domain={["auto", "auto"]}
                         hide={false}
                         tickFormatter={dateForm}
                     />

                     {
                        p.showROIGraph &&
                        <YAxis
                            dataKey="roi"
                            yAxisId="left"
                            type="number"
                            domain={["auto", "auto"]}
                            hide={hist.length === 0}
                            orientation="left"
                            tickFormatter={priceForm}
                        />
                     }
                     {
                        p.showROIGraph &&
                        <Line
                            type="linear"
                            dataKey="roi"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--cartesian-grid2)"
                            dot={false}
                            yAxisId="left"
                        />
                     }
                     {
                        p.showPriceGraph &&
                        <YAxis
                            dataKey="price"
                            type="number"
                            domain={["auto", "auto"]}
                            hide={hist.length === 0}
                            orientation="right"
                            tickFormatter={priceForm}
                        />
                     }
                     {
                        p.showPriceGraph &&
                        <Area
                            type="linear"
                            dataKey="price"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--ticker-history)"
                            fill="url(#colorUv)"
                            dot={false}
                        />
                     }
                     <Tooltip
                         content={CustomTooltip}
                         allowEscapeViewBox={{x: true, y: true}}
                         isAnimationActive={false}
                     />
                     {
                        p.showPriceGraph &&
                        p.showWALine &&
                        p.ticker.accounts.map(a =>
                           <ReferenceLine
                               key={`${a.account}-wa`}
                               y={a.end.weighted_avg}
                               stroke="var(--cartesian-grid)"
                               strokeDasharray="3 3"
                               isFront={true}
                           />
                        )
                     }
                     {
                        p.showPriceGraph &&
                        p.showACLine &&
                        p.ticker.accounts.map(a =>
                           <ReferenceLine
                               key={`${a.account.id}-ac`}
                               y={a.end.avg_cost}
                               stroke="var(--cartesian-grid)"
                               strokeDasharray="3 3"
                               isFront={true}
                           />
                        )
                     }
                 </ComposedChart>
                )
            }
         </AutoSizer>
      </div>
   );
}

export default History;
