import * as React from 'react';
import { useHistory as useRouterHistory,
   useLocation, useParams } from 'react-router-dom';
import useAccountIds from 'services/useAccountIds';
import useHistory from 'services/useHistory';
import useTransactions from 'services/useTransactions';
import { toDates, DateRange } from 'Dates';
import { SetHeader } from 'Header';
import Dashboard from 'Dashboard';
import { SplitMode, NotesMode } from 'Ledger/View';
import { Account } from 'services/useAccounts';
import { SelectAccount } from 'Account';
import { LedgerPanelProps } from 'Ledger/Panel';
import { PriceHistoryPanelProps } from 'PriceHistory/Panel';
import { TickerPanelProps } from 'Ticker/Panel';
import usePrefs from 'services/usePrefs';
import useTickers from 'services/useTickers';

const defaultPanels = [
   {
      type: 'pricehistory',
      commodity_id: -1,
      prices: [],
      dateRange: [new Date(), new Date()],
      showAverageCost: true,
      showROI: true,
      showPrice: true,
      rowspan: 1,
      colspan: 3,
      hidePanelHeader: false,
   } as PriceHistoryPanelProps,
   {
      type: 'ticker',
      rowspan: 1,
      colspan: 1,
      hidePanelHeader: true,
      showWALine: true,
      showACLine: true,
      hideHistory: true,
      ticker: undefined,
      acc: undefined,     // computed in Ticker/Panel
      accountIds: 'all',  // overridden later
      range: "forever",
      dateRange: toDates("forever"),
   } as TickerPanelProps,
   {
      type: 'ledger',
      accountIds: 'all',  // overridden later
      notes_mode: NotesMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
      borders: false,
      defaultExpand: true,
      valueColumn: false,
      hideBalance: false,
      hideReconcile: false,
      rowspan: 4,
      colspan: 4,
   } as LedgerPanelProps,
];

interface LedgerPageRouteProps {
   accountIds: string;
}


interface LedgerPageProps {
}
const LedgerPage: React.FC<LedgerPageProps & SetHeader> = p => {
   const { setHeader } = p;
   const { prefs } = usePrefs();

   // list of account ids (as string)
   const { accountIds } = useParams<LedgerPageRouteProps>();
   const { accounts, title } = useAccountIds(accountIds);

   const { search } = useLocation();
   const query = new URLSearchParams(search);
   const range: DateRange = query.get('range') as DateRange|null || "forever";

   const history = useRouterHistory();
   const { pushAccount } = useHistory();
   const transactions = useTransactions(accounts, range);

   const tickers = useTickers(
      prefs.currencyId        /* currencyId */,
      accounts.map(a => a.id) /* accountIds */,
      "forever"               /* range */,
      false                   /* hideIfNoShare */,
      undefined               /* commodity */,
      accounts.length !== 1   /* skip */,
   );

   const onAccountChange = React.useCallback(
      (a: Account) => {
         history.push(`/ledger/${a.id}`);
      },
      [history]
   );

   React.useEffect(
      () => {
         if (accounts.length === 1) {
            pushAccount(accounts[0].id);
         }
      },
      [accounts, pushAccount ]
   );

   React.useEffect(
      () => {
         setHeader({  /* Keep arrow next to account name */
            name:
               accounts.length === 1
               ? (
                  <SelectAccount
                     account={accounts[0]}
                     onChange={onAccountChange}
                     hideArrow={false}
                     format={a => a.fullName()}
                  />
               ) : title,
         });
      },
      [setHeader, accounts, onAccountChange, title]
   );

   const doNothing = React.useCallback(() => {}, []);

   return (
      <Dashboard
         name='ledger'
         className="main"
         defaultPanels={defaultPanels}
         setHeader={doNothing}
         overrides={
            {
               "ledger": {
                  accountIds,
                  transactions: transactions,
                  range,
               } as Partial<LedgerPanelProps>,
               "ticker": {
                  ticker: (
                     tickers && tickers.length === 1 ? tickers[0] : undefined
                  ),
                  dateRange: toDates(range),
               } as Partial<TickerPanelProps>,
               "pricehistory": {
                  commodity_id:
                     accounts && accounts.length === 1 ? accounts[0].id : -1,
                  prices:
                     tickers && tickers.length === 1
                        ? tickers[0].accounts[0].prices : [],
                  dateRange: toDates(range),
                  avg_cost:
                     tickers && tickers.length === 1
                     ? tickers[0].accounts[0].end.avg_cost : NaN,
                  weighted_avg:
                     tickers && tickers.length === 1
                     ? tickers[0].accounts[0].end.weighted_avg : NaN,
               } as Partial<PriceHistoryPanelProps>,
            }
         }
      />
   );
}

export default LedgerPage
