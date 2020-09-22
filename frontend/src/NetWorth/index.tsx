import * as React from 'react';
import { RelativeDate, dateToString } from 'Dates';
import { ListChildComponentProps } from 'react-window';
import Numeric from 'Numeric';
import AccountName from 'Account';
import { SetHeader } from 'Header';
import useBalanceWithThreshold from 'services/useBalanceWithThreshold';
import usePrefs from 'services/usePrefs';
import Table from 'List';
import "./NetWorth.css";

const NW_LINE_HEIGHT = 25;  // sync with var(--nw-line-height)

export interface NetworthProps {
   dates: RelativeDate[];
   showValue: boolean;
   showPrice: boolean;
   showShares: boolean;

   threshold: number;
   // Only show account if at least one of the value columns is above this
   // threshold (absolute value).
}

const Networth: React.FC<NetworthProps & SetHeader> = p => {
   const { prefs } = usePrefs();
   const { setHeader } = p;
   const {baseData, data} = useBalanceWithThreshold({
      ...p,
      currencyId: prefs.currencyId,
   });

   React.useEffect(
      () => setHeader({ title: 'Net worth' }),
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
                  r.atDate.map((d, idx)=> (
                     <React.Fragment key={idx}>
                     {
                        p.showShares &&
                        <span>
                           <Numeric
                              amount={d.shares}
                              precision={r.account?.sharesPrecision}
                           />
                        </span>
                     }
                     {
                        p.showPrice &&
                        <span>
                           <Numeric
                              amount={d.price}
                              unit={baseData.currencyId}
                           />
                        </span>
                     }
                     {
                        p.showValue &&
                        <span>
                           <Numeric
                              amount={d.shares * d.price}
                              unit={baseData.currencyId}
                           />
                        </span>
                     }
                  </React.Fragment>
                  ))
               }
            </Table.TR>
         );
      },
      [data, p.showPrice, p.showShares, p.showValue, baseData.currencyId]
   );

   const span = (p.showValue ? 1 : 0)
      + (p.showShares ? 1 : 0)
      + (p.showPrice ? 1 : 0);

   const header = (
      <>
         <Table.TR>
            <span className="th">Account</span>
            {
               p.dates.map(d =>
                  <span className={`th span${span}`} key={d} >
                     {dateToString(d)}
                  </span>)
            }
         </Table.TR>
         {
            (p.showShares || p.showPrice) &&
            <Table.TR>
               <Table.TH />
               {
                  p.dates.map(d => (
                     <React.Fragment key={d}>
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
                        <span />
                     }
                     {
                        p.showPrice &&
                        <span />
                     }
                     {
                        p.showValue &&
                        <span>
                           <Numeric
                              amount={baseData.totalValue[idx]}
                              unit={baseData.currencyId}
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
