import * as React from 'react';
import { ListChildComponentProps } from 'react-window';
import { SetHeaderProps } from 'Dashboard/Panel';
import { formatDate } from 'Dates';
import Numeric from 'Numeric';
import Table from 'List';
import useAccounts, { AccountList } from 'services/useAccounts';
import AccountName from 'Account';
import { LineChart, XAxis, YAxis, Line } from 'recharts';
import './Investment.scss';


const ROW_HEIGHT = 25;


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


interface TickerViewProps {
   accounts: AccountList;
   ticker: Ticker;
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
   const acc = p.accounts.accountsFromCurrency(p.ticker.id);

   return (
      <div className="trgroup" style={p.style} >
         <Table.TR>
            <Table.TD>{p.ticker.name}</Table.TD>
            <Table.TD>{p.ticker.ticker}</Table.TD>
            <Table.TD>{p.ticker.source}</Table.TD>
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
                        ROW_HEIGHT * (1 + (acc.length ? 1 : 0)) - 3
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
            acc.map(a =>
               <Table.TR key={a.id} secondary={true} >
                  <Table.TD />
                  <Table.TD>
                     <AccountName id={a.id} account={a} fullName={true} />
                  </Table.TD>
                  <Table.TD />
                  <Table.TD className="price" />
                  <Table.TD className="date" />
                  <Table.TD className="price" />
                  <Table.TD className="date" />
                  <Table.TD className="price" />
                  <Table.TD className="date" />
                  <Table.TD className="price" />
                  <Table.TD className="hist" />
               </Table.TR>
            )
         }
      </div>
   );
}

export interface InvestmentsPanelProps {
   borders?: boolean;
}

const InvestmentsPanel: React.FC<InvestmentsPanelProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   const { accounts } = useAccounts();
   const [tickers, setTickers] = React.useState<Ticker[]>([]);

   React.useEffect(
      () => setHeader?.('Investments'),
      [setHeader]
   );

   React.useEffect(
      () => {
         const dofetch = async () => {
            const resp = await window.fetch('/api/quotes');
            const data: Ticker[] = await resp.json();
            setTickers(data);
         }
         dofetch();
      },
      []
   );

   const itemKey = (index: number) => tickers[index].name;
   const itemSize = (index: number) => {
      const t = tickers[index];
      return (1 + accounts.accountsFromCurrency(t.id).length) * ROW_HEIGHT;
   }

   const getRow = (q: ListChildComponentProps) => {
      const t = tickers[q.index];
      return <TickerView ticker={t} style={q.style} accounts={accounts} />
   }

   const header = (
      <Table.TR>
         <Table.TH>Security</Table.TH>
         <Table.TH>Ticker</Table.TH>
         <Table.TH>Quote source</Table.TH>

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
      />
   );
}

export default InvestmentsPanel;
