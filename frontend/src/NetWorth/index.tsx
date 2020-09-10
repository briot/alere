import * as React from 'react';
import { RelativeDate, dateToString } from 'Dates';
import { ListChildComponentProps } from 'react-window';
import Numeric from 'Numeric';
import AccountName from 'Account';
import { SetHeaderProps } from 'Dashboard/Panel';
import useAccounts, { Account, AccountId } from 'services/useAccounts';
import usePrefs from 'services/usePrefs';
import Table from 'List';
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
            <Table.TR style={q.style} >
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
            </Table.TR>
         );
      },
      [data, p.showPrice, p.showShares, p.showValue, dates, prefs.currencyId]
   );

   const span = (p.showValue ? 1 : 0)
      + (p.showShares ? 1 : 0)
      + (p.showPrice ? 1 : 0);

   const header = (
      <>
         <Table.TR>
            <span className="th">Account</span>
            {
               dates.map((d, idx) =>
                  <span className={`th span${span}`} key={idx} >
                     {d}
                  </span>)
            }
         </Table.TR>
         {
            (p.showShares || p.showPrice) &&
            <Table.TR>
               <Table.TH />
               {
                  p.dates.map((d, idx) => (
                     <React.Fragment key={idx}>
                        {p.showShares && <Table.TH>Shares</Table.TH>}
                        {p.showPrice && <Table.TH>Price</Table.TH>}
                        {p.showValue && <Table.TH>Value</Table.TH>}
                     </React.Fragment>
                  ))
               }
            </Table.TR>
         }
      </>
   );

   const footer = (
      <div className="tfoot" >
         <div className="tr">
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
   );

   return (
      <div className="networth">
         <Table.Table
            itemCount={data.length}
            itemSize={NW_LINE_HEIGHT}
            itemKey={getKey}
            getRow={getRow}
            header={header}
            footer={footer}
         />
      </div>
   );
}
export default Networth;
