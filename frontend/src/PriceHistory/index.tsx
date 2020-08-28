import React from 'react';
import { Account } from 'services/useAccounts';
import { LineChart, XAxis, YAxis, CartesianGrid,
         Line, Tooltip } from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';
import usePrefs from 'services/usePrefs';
import './PriceHistory.scss';

interface Price {
   date: string;
   price: number;
}


interface PriceHistoryProps {
   account: Account;
}

const PriceHistory: React.FC<PriceHistoryProps> = p => {
   const { prefs } = usePrefs();
   const [data, setData] = React.useState<Price[]>([]);

   React.useEffect(
      () => {
         const doFetch = async () => {
            const resp = await window.fetch(
               `/api/prices/${p.account.id}?currency=${prefs.currencyId}`
            );
            const d: Price[] = await resp.json();
            setData(d);
         }
         doFetch();
      },
      [p.account, prefs.currencyId]
   );

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
                     <XAxis dataKey="date" />
                     <YAxis />
                     <CartesianGrid strokeDasharray="5 5"/>
                     <Tooltip />
                     <Line
                         type="monotone"
                         dataKey="price"
                         isAnimationActive={false}
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
