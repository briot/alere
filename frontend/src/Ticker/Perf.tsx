import { Ticker } from 'Ticker/types';
import { pastValue, PastValue } from 'Ticker/Past';
import Numeric from 'Numeric';
import { DateDisplay } from 'Dates';
import { DAY_MS, humanDateInterval } from 'services/utils';

const PastHeader: React.FC<PastValue> = p => <th>{p.header}</th>;

const Past: React.FC<PastValue> = p => {
   const perf = (p.toPrice / p.fromPrice - 1) * 100;
   return (
      !isNaN(perf)
      ? (
      <td>
         <div>
            {
               p.show_perf
               ? <Numeric amount={perf} colored={true} suffix="%"/>
               : <Numeric
                    amount={p.fromPrice}
                    commodity={p.commodity}
                    hideCommodity={true}
                 />
            }
         </div>
         <div className="tooltip">
            <table>
               <tbody>
                  <tr>
                     <td>
                        <DateDisplay when={p.fromDate} />
                     </td>
                     <td>
                        <DateDisplay when={p.toDate} />
                     </td>
                  </tr>
                  <tr>
                     <td>
                        <Numeric
                           amount={p.fromPrice}
                           commodity={p.commodity}
                           hideCommodity={true}
                        />
                     </td>
                     <td>
                        <Numeric
                           amount={p.toPrice}
                           commodity={p.commodity}
                           hideCommodity={true}
                        />
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </td>
      ) : <td />
   );
}

interface PerfProps {
   ticker: Ticker;
   dateRange: [Date, Date];
   showWALine?: boolean;
   showACLine?: boolean;
}

const Perfs: React.FC<PerfProps> = p => {
   const xrange = p.dateRange.map(d => d.getTime()) as [number, number];
   const hist =
      p.ticker.prices
      .filter(r => r[0] >= xrange[0] && r[0] <= xrange[1] && r[1] !== null)
      .map(r => ({t: r[0], price: r[1]}))

   const db_from_date = new Date(p.ticker.storedtime);
   const db_to_date = new Date();
   const db_interval = db_to_date.getTime() - db_from_date.getTime();
   const intv = (p.dateRange[1].getTime() - p.dateRange[0].getTime()) / DAY_MS;
   const perf = [
      intv >= 365 * 5 &&
         pastValue(p.ticker, DAY_MS * 365 * 5),   // 5 year perf
      intv >= 365 &&
         pastValue(p.ticker, DAY_MS * 365),       // 1 year perf
      intv >= 365 / 2 &&
         pastValue(p.ticker, DAY_MS * 365 / 2),   // 6 months perf
      Math.abs(intv - 365 / 4) < 4 &&
         pastValue(p.ticker, DAY_MS * 365 / 4),   // 3 months perf
      intv >= 365 / 12 &&
         pastValue(p.ticker, DAY_MS * 365 / 12),  // 1 month perf
      intv >= 5 &&
         pastValue(p.ticker, DAY_MS * 5),         // 5 days perf
      pastValue(p.ticker, DAY_MS),             // 1 day perf
      pastValue(p.ticker, 0),                  // intraday perf
      hist.length !== 0
      && db_from_date.getTime() !== hist[hist.length - 1].t  // from database
      && {
            fromDate: db_from_date,
            toDate: db_to_date,
            fromPrice: p.ticker.storedprice ?? NaN,
            toPrice: hist[hist.length - 1].price,
            commodity: p.ticker.id,
            header: `db (${humanDateInterval(db_interval)})`,
            show_perf: true,
         },
   ];

   return (
      <table>
         <thead>
            <tr>
               {perf.map(p => p && <PastHeader {...p} key={p.header} />)}
            </tr>
         </thead>
         <tbody>
            <tr>
               {perf.map(p => p && <Past {...p} key={p.header} />)}
            </tr>
         </tbody>
      </table>
   );
}

export default Perfs;
