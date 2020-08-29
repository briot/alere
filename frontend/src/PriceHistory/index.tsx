import React from 'react';
import { Account } from 'services/useAccounts';
import * as d3TimeFormat from 'd3-time-format';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import { LineChart, XAxis, YAxis, CartesianGrid,
         Line, Tooltip, Legend } from 'recharts';
import { Transaction } from 'Transaction';
import AutoSizer from 'react-virtualized-auto-sizer';
import usePrefs from 'services/usePrefs';
import './PriceHistory.scss';

interface Price {
   date: string;
   price: number;
}

interface Holding {
   date: number;
   price: number;
   holding: number;
   position: number;
}

interface PriceHistoryProps {
   account: Account;
   transactions: Transaction[];
}

const PriceHistory: React.FC<PriceHistoryProps> = p => {
   const { prefs } = usePrefs();
   const [data, setData] = React.useState<Holding[]>([]);

   React.useEffect(
      () => {
         const doFetch = async () => {
            const resp = await window.fetch(
               `/api/prices/${p.account.id}?currency=${prefs.currencyId}`
            );
            const d: Price[] = await resp.json();

            const merged: Holding[] = [];
            const merge = (d_idx: number, t_idx: number) => {
               const pr = d[d_idx];
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
               if (d_idx >= d.length) {
                  if (t_idx >= p.transactions.length) {
                     break;
                  }
                  merge(d_idx - 1, t_idx++);
               } else if (t_idx >= p.transactions.length) {
                  merge(d_idx++, t_idx - 1);
               } else if (d[d_idx].date === p.transactions[t_idx].date) {
                  merge(d_idx++, t_idx++);
               } else if (d[d_idx].date < p.transactions[t_idx].date) {
                  merge(d_idx++, t_idx - 1);
               } else {
                  merge(d_idx - 1, t_idx++);
               }
            }
            setData(merged);
         }
         doFetch();
      },
      [p.account, prefs.currencyId, p.transactions]
   );

   const dateForm = d3TimeFormat.timeFormat("%Y-%m-%d");
   const labelForm = (d: number|string) =>
      <span>{dateForm(new Date(d))}</span>;

   return (
      <div className='priceHistory'>
         <AutoSizer>
            {
               ({width, height}) => (
                  <LineChart
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
                     <YAxis
                         yAxisId="left"
                         domain={['dataMin', 'dataMax']}
                         stroke={d3ScaleChromatic.schemeCategory10[0]}
                     />
                     <YAxis
                         yAxisId="right"
                         orientation="right"
                         stroke={d3ScaleChromatic.schemeCategory10[1]}
                         domain={['dataMin', 'dataMax']}
                     />
                     <CartesianGrid strokeDasharray="5 5"/>
                     <Tooltip
                         labelFormatter={labelForm}
                     />
                     <Legend />
                     <Line
                         type="linear"
                         dataKey="price"
                         name="price"
                         id="price"
                         isAnimationActive={false}
                         connectNulls={true}
                         stroke={d3ScaleChromatic.schemeCategory10[0]}
                         yAxisId="left"
                         dot={false}
                     />
                     <Line
                         type="linear"
                         dataKey="holding"
                         name="holdings"
                         id="holdings"
                         isAnimationActive={false}
                         connectNulls={true}
                         stroke={d3ScaleChromatic.schemeCategory10[1]}
                         yAxisId="right"
                         dot={false}
                     />
                  </LineChart>
               )
            }
         </AutoSizer>
      </div>
   );
}

export default PriceHistory;
