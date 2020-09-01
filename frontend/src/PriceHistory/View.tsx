import React from 'react';
import { Account } from 'services/useAccounts';
import * as d3TimeFormat from 'd3-time-format';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Area,
         Line, Tooltip, Legend } from 'recharts';
import { Transaction } from 'Transaction';
import AutoSizer from 'react-virtualized-auto-sizer';
import usePrefs from 'services/usePrefs';
import useFetchPrices from 'services/useFetchPrices';
import './PriceHistory.scss';

interface Holding {
   date: number;
   price: number;
   holding: number;
   position: number;
}


interface PriceHistoryProps {
   account: Account;
   transactions: Transaction[];
   hidePositions?: boolean;
   hidePrices?: boolean;
   hideHoldings?: boolean;
}

const PriceHistoryView: React.FC<PriceHistoryProps> = p => {
   const { prefs } = usePrefs();
   const prices = useFetchPrices(p.account.id, prefs.currencyId);
   const [data, setData] = React.useState<Holding[]>([]);

   React.useEffect(
      () => {
         const merged: Holding[] = [];
         const merge = (d_idx: number, t_idx: number) => {
            const pr = prices[d_idx];
            const tr = p.transactions[t_idx];
            const position = tr?.balanceShares ?? NaN
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
      <div className='priceHistory'>
         <AutoSizer>
            {
               ({width, height}) => (
                  <ComposedChart
                     width={width}
                     height={height}
                     data={data}
                  >
                     <XAxis
                         dataKey="date"
                         domain={['auto', 'auto']}
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
                            hide={true}
                        />
                     }
                     {
                        showPositions &&
                        <Area
                            type="stepAfter"
                            dataKey="position"
                            legendType="square"
                            fill="var(--area-chart-fill)"
                            stroke="var(--area-chart-stroke)"
                            isAnimationActive={false}
                            yAxisId="leftPos"
                        />
                     }

                     {
                        showPrices &&
                        <YAxis
                            yAxisId="left"
                            domain={['dataMin', 'dataMax']}
                        />
                     }
                     {
                        showPrices &&
                        <Line
                            type="linear"
                            dataKey="price"
                            name="price"
                            id="price"
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
                            domain={['dataMin', 'dataMax']}
                        />
                     }
                     {
                        showHoldings &&
                        <Line
                            type="linear"
                            dataKey="holding"
                            name="holdings"
                            id="holdings"
                            isAnimationActive={false}
                            connectNulls={true}
                            stroke="var(--color-900)"
                            yAxisId="right"
                            dot={false}
                        />
                     }
                  </ComposedChart>
               )
            }
         </AutoSizer>
      </div>
   );
}

export default PriceHistoryView;
