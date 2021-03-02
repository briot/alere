import AutoSizer from 'react-virtualized-auto-sizer';
import { ComposedChart, XAxis, YAxis, Area, Tooltip, Line,
         ReferenceLine } from 'recharts';
import { AccountForTicker, Ticker } from 'Ticker/types';
import { dateForm } from 'services/utils';

const priceForm = (v: number) => v.toFixed(2);
const labelForm = (d: number|string) => <span>{dateForm(new Date(d))}</span>;

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
      .filter(r => r[0] >= xrange[0] && r[0] <= xrange[1] && r[1] !== null)
      .map(r => ({t: r[0], price: r[1], roi: (r[2] - 1) * 100}))

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
                         labelFormatter={labelForm}
                         contentStyle={{backgroundColor: "var(--panel-background)"}}
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
