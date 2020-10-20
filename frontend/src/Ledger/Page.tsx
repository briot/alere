import * as React from 'react';
import { useHistory as useRouterHistory,
   useLocation, useParams } from 'react-router-dom';
import useAccountIds from 'services/useAccountIds';
import useHistory from 'services/useHistory';
import useTransactions from 'services/useTransactions';
import useDashboard from 'services/useDashboard';
import { SetHeader } from 'Header';
import { Dashboard } from 'Dashboard';
import { BaseProps } from 'Dashboard/Module';
import { ComputedBaseLedgerProps, SplitMode, NotesMode } from 'Ledger';
import { Account } from 'services/useAccounts';
import { SelectAccount } from 'Account';
import { LedgerPanelProps } from 'Ledger/Module';
import { PriceHistoryModuleProps } from 'PriceHistory/Module';

const defaultPanels: BaseProps[] = [
   {
      type: 'pricehistory',
      accountIds: 'all',  // overridden later
      transactions: [],       // overridden later
      rowspan: 1,
      colspan: 4,
   } as PriceHistoryModuleProps,
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

   let { search } = useLocation();
   const query = new URLSearchParams(search);
   const kinds = query.get('kinds');

   const history = useRouterHistory();
   const { pushAccount } = useHistory();
   const transactions = useTransactions(accounts, "forever", kinds);
   const { panels, setPanels } = useDashboard('ledger', defaultPanels);

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

   return (
      <div className="main-area">
         <Dashboard
            panels={panels}
            setPanels={setPanels}
            defaults={{
               accountIds,
               kinds,
               transactions: transactions,
               range: "forever",
              } as Partial<ComputedBaseLedgerProps>
            }
         />
      </div>
   );
}

export default LedgerPage
