import * as React from 'react';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import { SetHeaderProps } from 'Dashboard/Panel';
import { formatDate } from 'Dates';
import Numeric from 'Numeric';
import Table from 'List';
import useAccounts, { AccountId, AccountList } from 'services/useAccounts';
import AccountName from 'Account';
import { LineChart, XAxis, YAxis, Line } from 'recharts';
import './Investment.scss';


const ROW_HEIGHT = 25;
const ACCOUNT_ROW_HEIGHT = 75;

//  When do we consider a number of shares to be zero (for rounding errors)
const THRESHOLD = 0.00000001;


interface Ticker {
   id: string;
   name: string;
   ticker: string;
   source: string;

   storedtime: string;   // timestamp of last stored price
   storedprice: number|null;

   // sorted chronologically
   prices: Array<[/*timestamp*/ number|null, /*close*/ number|null]>;
}

interface AccountTicker {
   account: AccountId;
   security: string;
   absvalue: number;
   absshares: number;
   value: number;
   shares: number;
}

type Response = [Ticker[], AccountTicker[]];


const accountsForTicker = (t: Ticker, accTick: AccountTicker[]) =>
     accTick.filter(a => a.security === t.id);


interface TickerViewProps {
   accounts: AccountList;
   ticker: Ticker;
   accountTickers: AccountTicker[];
   style?: React.CSSProperties;
}

const TickerView: React.FC<TickerViewProps> = p => {
   const pr = p.ticker.prices;

   const close = pr[pr.length - 1]?.[1] || NaN;
   const ts =pr[pr.length - 1]?.[0] || null;
   const date = ts === null ? '-' : formatDate(new Date(ts));

   const prevClose = pr[pr.length - 2]?.[1] || NaN;
   const prevTs = pr[pr.length - 2]?.[0] || null;
   const prevDate = prevTs === null ? '-' : formatDate(new Date(prevTs));

   const variation = (close / prevClose - 1) * 100;

   const hist = pr.map(r => ({t: r[0], price: r[1]}));
   const at = accountsForTicker(p.ticker, p.accountTickers);

   return (
      <div className="trgroup" style={p.style} >
         <Table.TR>
            <Table.TD>{p.ticker.name}</Table.TD>
            <Table.TD>{p.ticker.ticker}</Table.TD>
            <Table.TD className="source">{p.ticker.source}</Table.TD>
            <Table.TD className="price">
               <Numeric amount={p.ticker.storedprice} />
            </Table.TD>
            <Table.TD className="date">{p.ticker.storedtime}</Table.TD>
            <Table.TD className="price">
               <Numeric amount={prevClose} />
            </Table.TD>
            <Table.TD className="date">{prevDate}</Table.TD>
            <Table.TD className="price">
               <Numeric amount={close} />
            </Table.TD>
            <Table.TD className="date">{date}</Table.TD>
            <Table.TD className="price">
               {
                  variation
                  ? (
                     <>
                        <Numeric amount={variation} colored={true} />%
                     </>
                  ) : '-'
               }
            </Table.TD>
            <Table.TD className="hist">
               {
                  hist.length > 0 &&
                  <LineChart
                     width={100}
                     height={
                        // (-3) is for when we show borders
                        ROW_HEIGHT * (1 + (at.length ? 1 : 0)) - 3
                     }
                     data={hist}
                  >
                      <XAxis
                          dataKey="t"
                          scale="time"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          hide={true}
                      />
                      <YAxis
                          dataKey="price"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          hide={true}
                      />
                      <Line
                          type="linear"
                          dataKey="price"
                          isAnimationActive={false}
                          connectNulls={true}
                          stroke={
                             variation > 0
                             ? "var(--positive-fg)"
                             : "var(--negative-fg)"
                           }
                          dot={false}
                      />
                  </LineChart>
               }
            </Table.TD>
         </Table.TR>

         {
            at.map(a => {
               const weighted_avg = a.absvalue / a.absshares;
               const avg_cost = a.value / a.shares;
               return (
               <Table.TR key={a.account} secondary={true} className="account">
                  <Table.TD className="empty" />
                  <Table.TD>
                     <div>
                        <AccountName
                           id={a.account}
                           account={p.accounts.getAccount(a.account)}
                           fullName={true}
                        />
                     </div>

                     {
                        a.absshares > THRESHOLD
                        ? (
                        <div
                           title="Weighted Average: average price at which you sold or bought shares. It does not include shares added or subtracted with no paiement."
                        >
                           Weighted Average: <Numeric
                              amount={weighted_avg}
                              className={
                                 weighted_avg >= close ? 'negative' : 'positive'
                              }
                           />
                        </div>
                      ) : null
                     }
                     {
                        Math.abs(a.shares) > THRESHOLD
                        ? (
                        <div
                           title="Average Cost: equivalent price for the remaining shares you own, taking into account dividends, added and removed shares,..."
                        >
                           Average Cost: <Numeric
                              amount={avg_cost}
                              className={
                                 avg_cost >= close ? 'negative' : 'positive'
                              }
                           />
                        </div>
                        ) : null
                     }
                  </Table.TD>
                  <Table.TD className="shares" >
                     Shares: <Numeric amount={a.shares} />
                  </Table.TD>
                  <Table.TD className="hist" />
               </Table.TR>
               );
            })
         }
      </div>
   );
}

export interface InvestmentsPanelProps {
   borders?: boolean;
   hideIfNoShare?: boolean;
}

const InvestmentsPanel: React.FC<InvestmentsPanelProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const { accounts } = useAccounts();
   const list = React.useRef<VariableSizeList>(null);

   const [response, setResponse] = React.useState<Response>([[], []]);

   const accTick = React.useMemo(
      () => p.hideIfNoShare
         ? response[1].filter(a => Math.abs(a.shares) > THRESHOLD)
         : response[1],
      [p.hideIfNoShare, response]
   );
   const tickers = React.useMemo(
      () => p.hideIfNoShare
         ? response[0].filter(t => accountsForTicker(t, accTick).length > 0)
         : response[0],
      [p.hideIfNoShare, accTick, response]
   );

   React.useEffect(
      () => list.current?.resetAfterIndex(0),
      [tickers]
   );

   React.useEffect(
      () => setHeader?.('Investments'),
      [setHeader]
   );

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch('/api/quotes');
            const data: Response = await resp.json();
            setResponse(data);
         }
         dofetch();
      },
      []
   );

   const itemKey = (index: number) => tickers[index].name;
   const itemSize = (index: number) => {
      const t = tickers[index];
      const a = accountsForTicker(t, accTick);
      return ROW_HEIGHT + a.length * ACCOUNT_ROW_HEIGHT;
   }

   const getRow = (q: ListChildComponentProps) => {
      const t = tickers[q.index];
      return <TickerView
         ticker={t}
         style={q.style}
         accounts={accounts}
         accountTickers={accTick}
      />
   }

   const header = (
      <Table.TR>
         <Table.TH>Security</Table.TH>
         <Table.TH>Ticker</Table.TH>
         <Table.TH className="source">Quote source</Table.TH>

         <Table.TH
            className="price"
            title="Most recent price stored in the database"
         >
            S-price
         </Table.TH>
         <Table.TH
            className="date"
            title="Date of the most recent price stored in the database"
         >
            S-date
         </Table.TH>

         <Table.TH
            className="price"
            title="Previous downloaded quotes"
         >
            P-price
         </Table.TH>
         <Table.TH
            className="date"
            title="Previous day for the downloaded quotes"
         >
            P-date
         </Table.TH>

         <Table.TH className="price">Price</Table.TH>
         <Table.TH className="date">Date</Table.TH>
         <Table.TH
            className="price"
            title="Variation between the last two downloaded quotes"
         >
            Performance
         </Table.TH>
         <Table.TH className="hist" />
      </Table.TR>
   );

   return (
      <Table.Table
         className="investment"
         itemCount={tickers.length}
         itemSize={itemSize}
         itemKey={itemKey}
         getRow={getRow}
         header={header}
         borders={p.borders}
         ref={list}
      />
   );
}

export default InvestmentsPanel;
