import * as React from 'react';
import { Link } from 'react-router-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import Numeric from 'Numeric';
import AutoSizer from 'react-virtualized-auto-sizer';
import { AccountId } from 'Transaction';
import useAccounts from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import "./NetWorth.css";

interface NetworthLine {
   accountId: AccountId;
   shares: number;
   date: string;
   price: number|undefined;
}
type Networth = NetworthLine[];


interface NetworthProps {
   date?: string;
   showPrice?: boolean;
   showShares?: boolean;
}

const Networth: React.FC<NetworthProps> = p => {
   const [data, setData] = React.useState<Networth>([]);
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();

   const totalShares = React.useMemo(
      () => data.reduce((t, d) => t + d.shares, 0),
      [data]
   );
   const total = React.useMemo(
      () => data.reduce((t, d) =>
         t + d.shares * (d.price ?? NaN), 0),
      [data]
   );

   React.useEffect(
      () => {
         const doFetch = async () => {
            const resp = await window.fetch(
               `/api/plots/networth`
               + `?currency=${prefs.currencyId}`
               + `&date=${p.date || ''}`
            );
            const d: Networth = await resp.json()
            d.sort((d1, d2) =>
               accounts.name(d1.accountId)
                  .localeCompare(accounts.name(d2.accountId)));
            setData(d);
         }
         doFetch();
      },
      [accounts, prefs.currencyId, p.date]
   );

   const getKey = (index: number) => {
      return data[index].accountId;
   };

   const getRow = React.useCallback(
      (q: ListChildComponentProps) => {
         const r = data[q.index];
         return (
            <div style={q.style} className="row" >
               <span>
                  <Link to={`/ledger/${r.accountId}`}>
                     {accounts.name(r.accountId)}
                  </Link>
               </span>
               {
                  p.showShares &&
                  <span>
                     <Numeric
                        amount={r.shares}
                        currency={accounts.currencyId(r.accountId)}
                     />
                  </span>
               }
               {
                  p.showPrice &&
                  <span>
                     <Numeric
                        amount={r.price}
                        currency={prefs.currencyId}
                     />
                  </span>
               }
               <span>
                  <Numeric
                     amount={r.shares * (r.price ?? NaN)}
                     currency={prefs.currencyId}
                  />
               </span>
            </div>
         );
      },
      [data, accounts, p.showPrice, p.showShares, prefs.currencyId]
   );

   return (
      <div className="networth">
         <div className="tbody">
            <AutoSizer>
               {
                  ({ width, height }) => (
                     <FixedSizeList
                        width={width}
                        height={height}
                        itemCount={data.length}
                        itemSize={20}
                        itemKey={getKey}
                     >
                        {getRow}
                     </FixedSizeList>
                  )
               }
            </AutoSizer>
         </div>
         <div className="tfoot row" >
            <span>Total</span>
            {
               p.showShares &&
               <span>
                  <Numeric
                     amount={totalShares}
                  />
               </span>
            }
            {
               p.showPrice &&
               <span />
            }
            <span>
               <Numeric
                  amount={total}
                  currency={prefs.currencyId}
               />
            </span>
         </div>
      </div>
   );
}
export default Networth;
