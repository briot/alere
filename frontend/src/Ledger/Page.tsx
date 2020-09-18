import * as React from 'react';
import { useHistory as useRouterHistory, useParams } from 'react-router-dom';
import useAccounts from 'services/useAccounts';
import useHistory from 'services/useHistory';
import useTransactions from 'services/useTransactions';
import useDashboard from 'services/useDashboard';
import { SetHeader } from 'Header';
import { Dashboard } from 'Dashboard';
import { BaseProps } from 'Dashboard/Module';
import { SplitMode, TransactionMode } from 'Ledger';
import { Account } from 'services/useAccounts';
import { SelectAccount } from 'Account';
import { LedgerPanelProps } from 'Ledger/Module';
import { PriceHistoryModuleProps } from 'PriceHistory/Module';

const defaultPanels: BaseProps[] = [
   {
      type: 'pricehistory',
      accountId: 0,  // overridden later
      transactions: undefined,  // overridden later
      rowspan: 1,
      colspan: 4,
   } as PriceHistoryModuleProps,
   {
      type: 'ledger',
      accountIds: 'all',  // overridden later
      transactions: undefined,  // overridden later
      trans_mode: TransactionMode.ONE_LINE,
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


interface LedgerPageProps {
}
const LedgerPage: React.FC<LedgerPageProps & SetHeader> = p => {
   const { setHeader } = p;
   const { accountId } = useParams();
   const history = useRouterHistory();
   const { accounts } = useAccounts();
   const { pushAccount } = useHistory();
   const account = accounts.getAccount(accountId);
   const transactions = useTransactions([accountId], "forever");
   const { panels, setPanels } = useDashboard('ledger', defaultPanels);

   const onAccountChange = React.useCallback(
      (a: Account) => {
         history.push(`/ledger/${a.id}`);
      },
      [history]
   );

   React.useEffect(
      () => pushAccount(accountId),
      [accountId, pushAccount ]
   );

   React.useEffect(
      () => {
         setHeader({  /* Keep arrow next to account name */
            title: (
               <div>
                  <SelectAccount
                     accountId={accountId}
                     onChange={onAccountChange}
                     hideArrow={false}
                  />
               </div>
            )
         });
      },
      [setHeader, accountId, onAccountChange]
   );

   if (!account) {
      return <div className="main-area">Unknown account</div>;
   }

   return (
      <div className="main-area">
         <Dashboard
            panels={panels}
            setPanels={setPanels}
            defaults={{
               accountId: accountId,
               accountIds: [accountId],
               transactions: transactions,
               range: "forever",
            }}
         />
      </div>
   );
}

export default LedgerPage
