import AutoSizer from 'react-virtualized-auto-sizer';
import { AreaChart, XAxis, YAxis, Area, Tooltip,
         ReferenceLine } from 'recharts';
import { Ticker } from 'Ticker/types';
import { dateForm } from 'services/utils';

const priceForm = (v: number) => v.toFixed(2);
const labelForm = (d: number|string) => <span>{dateForm(new Date(d))}</span>;

interface HistoryProps {
   ticker: Ticker;
   dateRange: [Date, Date];
   showWALine?: boolean;
   showACLine?: boolean;
}

const History: React.FC<HistoryProps> = p => {
   const xrange = p.dateRange.map(d => d.getTime()) as [number, number];
   const hist =
      p.ticker.prices
      .filter(r => r[0] >= xrange[0] && r[0] <= xrange[1] && r[1] !== null)
      .map(r => ({t: r[0], price: r[1]}))

   return (
      <div className="hist" title={`Prices from ${p.ticker.source}`}>
         <AutoSizer>
            {
               ({width, height}) => (
                 <AreaChart
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
                     <YAxis
                         dataKey="price"
                         type="number"
                         domain={["auto", "auto"]}
                         hide={false}
                         orientation="right"
                         tickFormatter={priceForm}
                     />
                     <Tooltip
                         labelFormatter={labelForm}
                         contentStyle={{backgroundColor: "var(--panel-background)"}}
                         allowEscapeViewBox={{x: true, y: true}}
                         isAnimationActive={false}
                     />
                     {
                        p.showWALine &&
                        p.ticker.accounts.map(a =>
                           <ReferenceLine
                               key={`${a.account}-wa`}
                               y={a.end.absvalue / a.end.absshares}
                               stroke="var(--cartesian-grid)"
                               strokeDasharray="3 3"
                               isFront={true}
                           />
                        )
                     }
                     {
                        p.showACLine &&
                        p.ticker.accounts.map(a =>
                           <ReferenceLine
                               key={`${a.account}-ac`}
                               y={a.end.value / a.end.shares}
                               stroke="var(--cartesian-grid)"
                               strokeDasharray="3 3"
                               isFront={true}
                           />
                        )
                     }
                     <Area
                         type="linear"
                         dataKey="price"
                         isAnimationActive={false}
                         connectNulls={true}
                         stroke="var(--ticker-history)"
                         fill="url(#colorUv)"
                         dot={false}
                     />
                 </AreaChart>
                )
            }
         </AutoSizer>
      </div>
   );
}

export default History;
