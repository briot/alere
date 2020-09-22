import * as React from 'react';
import { RelativeDate, dateToString } from 'Dates';
import Numeric from 'Numeric';
import AccountName from 'Account';
import { SetHeader } from 'Header';
import { BalanceList } from 'services/useBalance';
import useBalanceWithThreshold, {
   BalanceWithAccount } from 'services/useBalanceWithThreshold';
import usePrefs from 'services/usePrefs';
import ListWithColumns, { Column } from 'List/ListWithColumns';
import "./NetWorth.css";

const columnAccountName: Column<BalanceWithAccount> = {
   head: () => 'Account',
   cell: d => <AccountName id={d.accountId} account={d.account} />,
   foot: () => "Total",
};

const columnShares = (base: BalanceList, date_idx: number) => ({
   head: () => "Shares",
   cell: (d: BalanceWithAccount) =>
      <Numeric
         amount={d.atDate[date_idx].shares}
         precision={d.account?.sharesPrecision}
      />,
});

const columnPrice = (base: BalanceList, date_idx: number) => ({
   head: () => "Price",
   cell: (d: BalanceWithAccount) =>
      <Numeric
         amount={d.atDate[date_idx].price}
         unit={base.currencyId}
      />
});

const columnValue = (base: BalanceList, date_idx: number) => ({
   head: () => dateToString(base.dates[date_idx]),
   cell: (d: BalanceWithAccount) =>
      <Numeric
         amount={d.atDate[date_idx].price * d.atDate[date_idx].shares}
         unit={base.currencyId}
      />,
   foot: () =>
      <Numeric
         amount={base.totalValue[date_idx]}
         unit={base.currencyId}
      />
});

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
   const {baseData, data} = useBalanceWithThreshold({
      ...p,
      currencyId: prefs.currencyId,
   });

   const { setHeader } = p;
   React.useEffect(
      () => setHeader({ title: 'Net worth' }),
      [setHeader]
   );

   return (
      <ListWithColumns
         className="networth"
         columns={[
               undefined,  /* typescript workaround */
               columnAccountName,
            ].concat(p.dates.flatMap((_, date_idx) => [
               p.showShares ? columnShares(baseData, date_idx) : undefined,
               p.showPrice ? columnPrice(baseData, date_idx) : undefined,
               p.showValue ? columnValue(baseData, date_idx) : undefined,
            ]))
         }
         data={data}
         getKey={r => r.accountId}
      />
   );
}
export default Networth;
