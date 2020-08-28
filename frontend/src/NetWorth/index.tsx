import * as React from 'react';
import { RelativeDate, dateToString } from 'Dates';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import Numeric from 'Numeric';
import AutoSizer from 'react-virtualized-auto-sizer';
import AccountName from 'Account';
import { SetHeaderProps } from 'Panel';
import useAccounts, { Account, AccountId } from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import "./NetWorth.css";

interface NetworthLine {
   account: Account | undefined;
   accountId: AccountId;
   shares: number[];
   price: (number|undefined)[];
}
type Networth = NetworthLine[];

const NW_LINE_HEIGHT = 25;  // sync with var(--nw-line-height)


export interface NetworthProps {
   dates: RelativeDate[];
   showValue?: boolean;
   showPrice?: boolean;
   showShares?: boolean;

   threshold?: number;
   // Only show account if at least one of the value columns is above this
   // threshold (absolute value).
}

const Networth: React.FC<NetworthProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const [baseData, setBaseData] = React.useState<Networth>([]);
   const { accounts } = useAccounts();
   const { prefs } = usePrefs();
   const threshold = p.threshold === undefined ? 0.01 : p.threshold;

   const dates = React.useMemo(
      () => p.dates.map(dateToString),
      [p.dates]
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
            setBaseData(d);
         }
         doFetch();
      },
      [prefs.currencyId, dates]
   );

   const data: Networth = React.useMemo(
      () => {
         let d = [...baseData];
         d.forEach(n =>
            n.account = accounts.getAccount(n.accountId)
         );

         // Remove lines with only 0 values
         if (threshold !== 0) {
            d = d.filter(a => {
               let hasNonZero = false;
               dates.forEach((when, idx) => {
                  if (Math.abs(a.shares[idx] * (a.price[idx] ?? NaN))
                      > threshold
                     ) {
                     hasNonZero = true;
                  }
               });
               return hasNonZero;
            });
         }

         // Sort alphabetically
         d.sort((a, b) =>
            a.account
               ? b.account
                  ? a.account.name.localeCompare(b.account.name)
                  : 1
               : -1
         );
         return d;
      },
      [accounts, threshold, dates, baseData]
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
      () => setHeader?.('Net worth'),
      [setHeader]
   );

   const getKey = (index: number) => {
      return data[index].accountId;
   };

   const getRow = React.useCallback(
      (q: ListChildComponentProps) => {
         const r = data[q.index];
         return (
            <div style={q.style} className="row" key={r.accountId} >
               <AccountName
                   id={r.accountId}
                   account={r.account}
               />
               {
                  dates.map((d, idx) => (
                     <React.Fragment key={idx}>
                     {
                        p.showShares &&
                        <span>
                           <Numeric
                              amount={r.shares[idx]}
                              precision={r.account?.sharesPrecision}
                           />
                        </span>
                     }
                     {
                        p.showPrice &&
                        <span>
                           <Numeric
                              amount={r.price[idx]}
                              currency={prefs.currencyId
                                  || r.account?.currencySymbol}
                           />
                        </span>
                     }
                     {
                        p.showValue &&
                        <span>
                           <Numeric
                              amount={r.shares[idx] * (r.price[idx] ?? NaN)}
                              currency={prefs.currencyId
                                  || r.account?.currencySymbol}
                           />
                        </span>
                     }
                  </React.Fragment>
                  ))
               }
            </div>
         );
      },
      [data, p.showPrice, p.showShares, p.showValue, dates, prefs.currencyId]
   );

   const span = (p.showValue ? 1 : 0)
      + (p.showShares ? 1 : 0)
      + (p.showPrice ? 1 : 0);

   return (
      <div className="networth">
         <div className="thead">
            <div className="row">
               <span>Account</span>
               {
                  dates.map((d, idx) =>
                     <span className={`span${span}`} key={idx} >
                        {d}
                     </span>)
               }
            </div>
            {
               (p.showShares || p.showPrice) &&
               <div className="row">
                  <span />
                  {
                     p.dates.map((d, idx) => (
                        <React.Fragment key={idx}>
                           {
                              p.showShares && <span>Shares</span>
                           }
                           {
                              p.showPrice && <span>Price</span>
                           }
                           {
                              p.showValue && <span>Value</span>
                           }
                        </React.Fragment>
                     ))
                  }
               </div>
            }
         </div>
         <div className="tbody">
            <AutoSizer>
               {
                  ({ width, height }) => (
                     <FixedSizeList
                        width={width}
                        height={height}
                        itemCount={data.length}
                        itemSize={NW_LINE_HEIGHT}
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
                     <React.Fragment key={idx}>
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
                        {
                           p.showValue &&
                           <span>
                              <Numeric
                                 amount={total[idx]}
                                 currency={prefs.currencyId}
                              />
                           </span>
                        }
                     </React.Fragment>
                  ))
               }
            </div>
         </div>
      </div>
   );
}
export default Networth;
