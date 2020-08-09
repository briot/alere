import * as React from 'react';
import { Link } from 'react-router-dom';
import { RelativeDate, toDate } from 'Dates';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import Numeric from 'Numeric';
import AutoSizer from 'react-virtualized-auto-sizer';
import { AccountId } from 'Transaction';
import useAccounts from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import "./NetWorth.css";

interface NetworthLine {
   accountId: AccountId;
   shares: number[];
   price: (number|undefined)[];
}
type Networth = NetworthLine[];


interface NetworthProps {
   dates: RelativeDate[];
   showPrice?: boolean;
   showShares?: boolean;
}

const Networth: React.FC<NetworthProps> = p => {
   const [data, setData] = React.useState<Networth>([]);
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();

   const dates = React.useMemo(
      () => p.dates.map(toDate),
      [p.dates]
   );

   const totalShares = React.useMemo(
      () => p.dates.flatMap(
         (d, idx) => data.reduce((t, d) => t + d.shares[idx], 0)
      ),
      [p.dates, data]
   );

   const total = React.useMemo(
      () => p.dates.flatMap(
         (d, idx) =>
            data
             .filter(d => d.price[idx])
             .reduce((t, d) => t + d.shares[idx] * d.price[idx]!, 0),
      ),
      [p.dates, data]
   );

   React.useEffect(
      () => {
         const doFetch = async () => {
            const resp = await window.fetch(
               `/api/plots/networth`
               + `?currency=${prefs.currencyId}`
               + `&dates=${dates.join(',')}`
            );
            const d: Networth = await resp.json()
            d.sort((d1, d2) =>
               accounts.name(d1.accountId)
                  .localeCompare(accounts.name(d2.accountId)));
            setData(d);
         }
         doFetch();
      },
      [accounts, prefs.currencyId, dates]
   );

   const getKey = (index: number) => {
      return data[index].accountId;
   };

   const getRow = React.useCallback(
      (q: ListChildComponentProps) => {
         const r = data[q.index];
         return (
            <div style={q.style} className="row" key={r.accountId} >
               <span title={accounts.name(r.accountId)}>
                  <Link to={`/ledger/${r.accountId}`}>
                     {accounts.name(r.accountId)}
                  </Link>
               </span>
               {
                  dates.map((d, idx) => (
                     <React.Fragment key={d}>
                     {
                        p.showShares &&
                        <span>
                           <Numeric
                              amount={r.shares[idx]}
                              currency={accounts.currencyId(r.accountId)}
                           />
                        </span>
                     }
                     {
                        p.showPrice &&
                        <span>
                           <Numeric
                              amount={r.price[idx]}
                              currency={prefs.currencyId}
                           />
                        </span>
                     }
                     <span>
                        <Numeric
                           amount={r.shares[idx] * (r.price[idx] ?? NaN)}
                           currency={prefs.currencyId}
                        />
                     </span>
                  </React.Fragment>
                  ))
               }
            </div>
         );
      },
      [data, accounts, p.showPrice, p.showShares, prefs.currencyId,
       dates]
   );

   return (
      <div className="networth">
         <div className="thead">
            <div className="row">
               <span></span>
               {
                  dates.map(d =>
                     <span
                        className={`span${1 + (p.showShares ? 1 : 0) + (p.showPrice ? 1 : 0)}`}
                        key={d}
                     >
                        {d}
                     </span>)
               }
            </div>
            <div className="row">
               <span>Account</span>
               {
                  p.dates.map((d, idx) => (
                     <React.Fragment key={d}>
                        {
                           p.showShares && <span>Shares</span>
                        }
                        {
                           p.showPrice && <span>Price</span>
                        }
                        <span>Value</span>
                     </React.Fragment>
                  ))
               }
            </div>
         </div>
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
         <div className="tfoot" >
            <div className="row">
               <span>Total</span>
               {
                  p.dates.map((d, idx) => (
                     <React.Fragment key={d}>
                        {
                           p.showShares &&
                           <span>
                              <Numeric
                                 amount={totalShares[idx]}
                              />
                           </span>
                        }
                        {
                           p.showPrice &&
                           <span />
                        }
                        <span>
                           <Numeric
                              amount={total[idx]}
                              currency={prefs.currencyId}
                           />
                        </span>
                     </React.Fragment>
                  ))
               }
            </div>
         </div>
      </div>
   );
}
export default Networth;
