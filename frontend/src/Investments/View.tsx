import * as React from 'react';
import { DateRange } from 'Dates';
import usePrefs, { Preferences } from '../services/usePrefs';
import { TickerPanelProps } from 'Ticker/Panel';
import { AccountForTicker, ComputedTicker, Ticker,
         computeTicker, dateForm } from 'Ticker/View';
import { DashboardFromPanels } from 'Dashboard';
import AccountName from 'Account';
import Numeric from 'Numeric';
import ListWithColumns, { Column, LogicalRow } from 'List/ListWithColumns';
import useTickers from 'services/useTickers';
import './Investments.scss';

/**
 * Show all the user's investments
 */

export interface InvestmentsProps {
   hideIfNoShare: boolean;
   showWALine: boolean;
   showACLine: boolean;
   fromProviders: boolean; // whether to load prices from source provides
   asTable?: boolean;
   range: DateRange;
}

interface RowData {
   d: ComputedTicker;
   ticker: Ticker;
   acc: AccountForTicker;
   accName: string;
   prefs: Preferences;
}

const columnTickerName: Column<RowData, InvestmentsProps> = {
   id: 'Ticker',
   cell: (r: RowData) => r.ticker.name,
   compare: (r1: RowData, r2: RowData) =>
      r1.ticker.name.toLowerCase().localeCompare(r2.ticker.name.toLowerCase()),
}

const columnAccountName: Column<RowData, InvestmentsProps> = {
   id: 'Account',
   cell: (r: RowData) =>
      <AccountName id={r.acc.account.id} account={r.acc.account} fullName={true} />,
   compare: (r1: RowData, r2: RowData) => r1.accName.localeCompare(r2.accName),
};

const columnValue: Column<RowData, InvestmentsProps> = {
   id: 'Value',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric amount={r.d.worth} commodity={r.prefs.currencyId} />,
   compare: (r1: RowData, r2: RowData) => r1.d.worth - r2.d.worth,
};

const columnReturn: Column<RowData, InvestmentsProps> = {
   id: 'Return',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric amount={(r.d.worth / r.d.invested - 1) * 100} suffix='%' />,
   compare: (r1: RowData, r2: RowData) =>
      (r1.d.worth / r1.d.invested) - (r2.d.worth / r2.d.invested)
}

const columnAnnualizedReturn: Column<RowData, InvestmentsProps> = {
   id: 'Return/y',
   title: 'Annualized return',
   className: 'amount',
   cell: (r: RowData) => <Numeric amount={r.d.annualized_return} suffix='%' />,
   compare: (r1: RowData, r2: RowData) =>
      r1.d.annualized_return - r2.d.annualized_return,
}

const columnAnnualizedReturnRecent: Column<RowData, InvestmentsProps> = {
   id: 'RetRec/y',
   title: 'Annualized return since most recent trade',
   cellTitle: (r: RowData) => `since ${dateForm(r.d.latest)}`,
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric amount={r.d.annualized_return_recent} suffix='%' />,
   compare: (r1: RowData, r2: RowData) =>
      r1.d.annualized_return_recent - r2.d.annualized_return_recent,
}

const columnPL: Column<RowData, InvestmentsProps> = {
   id: 'P&L',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric
         amount={r.d.worth - r.d.invested}
         commodity={r.prefs.currencyId}
      />,
   compare: (r1: RowData, r2: RowData) =>
      (r1.d.worth - r1.d.invested) - (r2.d.worth - r2.d.invested),
}

const columnInvested: Column<RowData, InvestmentsProps> = {
   id: 'Invested',
   className: 'amount',
   cell: (r: RowData) =>
      <Numeric amount={r.d.invested} commodity={r.prefs.currencyId} />,
   compare: (r1: RowData, r2: RowData) => r1.d.invested - r2.d.invested,
}

// const columnWeightedCost: Column<RowData, InvestmentsProps> = {
// const columnGainLastYear: Column<RowData, InvestmentsProps> = {

const columns: Column<RowData, InvestmentsProps>[] = [
   columnTickerName,
   columnAccountName,
   columnValue,
   columnInvested,
   columnPL,
   columnReturn,
   columnAnnualizedReturn,
   columnAnnualizedReturnRecent,
];

const Investments: React.FC<InvestmentsProps> = p => {
   const { prefs } = usePrefs();
   const { data } = useTickers(
      prefs.currencyId, p.fromProviders,
      'all' /* accountIds */, p.range, p.hideIfNoShare);
   const doNothing = React.useCallback(() => {}, []);
   const [sorted, setSorted] = React.useState('');
   const rows: LogicalRow<RowData, InvestmentsProps>[] = React.useMemo(
      () => data?.flatMap(ticker => ticker.accounts.map(acc => ({
         key: `${ticker.id}--${acc.account.id}`,
         data: { ticker,
                 acc,
                 prefs,
                 d: computeTicker(ticker, acc, true /* atEnd */, 0 /* ms_elapse */),
                 accName: acc.account.fullName(),
               },
      }))) ?? [],
      [data, prefs],
   );

   if (p.asTable) {
      return (
         <ListWithColumns
            className="investmentsTable"
            columns={columns}
            rows={rows}
            settings={p}
            defaultExpand={true}
            indentNested={true}
            sortOn={sorted}
            setSortOn={setSorted}
         />
      );

   } else {
      const panels = data?.map(t => ({
            type: 'ticker',
            colspan: 1,
            rowspan: 1,
            ticker: t,
            accountIds: 'all',
            range: p.range,
            showWALine: p.showWALine,
            showACLine: p.showACLine,
         } as TickerPanelProps
      ));

      return (
         <DashboardFromPanels
            panels={panels ?? []}
            setPanels={doNothing}
            className="investments"
         />
      );
   }
}
export default Investments;
