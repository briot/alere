import * as React from 'react';
import { useHistory as useRouterHistory,
   useLocation, useParams } from 'react-router-dom';
import useAccountIds from 'services/useAccountIds';
import useHistory from 'services/useHistory';
import useTransactions from 'services/useTransactions';
import { DateRange } from 'Dates';
import { SetHeader } from 'Header';
import Dashboard from 'Dashboard';
import { SplitMode, NotesMode } from 'Ledger/View';
import { Account } from 'services/useAccounts';
import { SelectAccount } from 'Account';
import { LedgerPanelProps } from 'Ledger/Panel';
import { PriceHistoryPanelProps } from 'PriceHistory/Panel';
import { TickerPanelProps } from 'Ticker/Panel';

const defaultPanels = [
   {
      type: 'pricehistory',
      accountIds: 'all',  // overridden later
      transactions: [],   // overridden later
      range: "forever",
      rowspan: 1,
      colspan: 3,
   } as PriceHistoryPanelProps,
   {
      type: 'ticker',
      rowspan: 1,
      colspan: 1,
      showWALine: true,
      showACLine: true,
      ticker: undefined,
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

   // list of account ids
   const { accountIds } = useParams<LedgerPageRouteProps>();
   const { accounts, title } = useAccountIds(accountIds);

   const { search } = useLocation();
   const query = new URLSearchParams(search);
   const range: DateRange = query.get('range') as DateRange|null || "forever";

   const history = useRouterHistory();
   const { pushAccount } = useHistory();
   const transactions = useTransactions(accounts, range);

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
            title:
               accounts.length === 1
               ? (
                  <SelectAccount
                     accountId={accounts[0].id}
                     onChange={onAccountChange}
                     hideArrow={false}
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
         defaultPanels={defaultPanels}
         setHeader={doNothing}
         overrides={
            {
               accountIds,
               transactions: transactions,
               range,

               // for 'ticker' view
               ticker: (
                  accounts.length === 1 && accounts[0].commodity.id > 0
                  ? accounts[0].commodity.id
                  : undefined
               ),
            }
         }
      />
   );
}

export default LedgerPage
