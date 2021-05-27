/**
 * A hook that lists all the pages that should be listed in the left side
 * panel.
 */
import * as React from 'react';
import { AccountsPanelProps } from '@/Accounts/Panel';
import { CashflowPanelProps } from '@/Cashflow/Panel';
import { HeaderProps } from '@/Header';
import { IncomeExpensePanelProps } from '@/IncomeExpense/Panel';
import { InvestmentsPanelProps } from '@/Investments/Panel';
import { LedgerPanelProps } from '@/Ledger/Panel';
import { MeanPanelProps }  from '@/Mean/Panel';
import { NetworthHistoryPanelProps } from '@/NWHistory/Panel';
import { NetworthPanelProps } from '@/NetWorth/Panel';
import { PanelBaseProps } from '@/Dashboard/Panel';
import { PerformancePanelProps } from '@/Performance/Panel';
import { SplitMode, NotesMode } from '@/Ledger/View';
import { TreeMode } from '@/services/useAccountTree';
import { WelcomePanelProps } from '@/Welcome/Panel';
import { capitalize } from '@/services/utils';
import useSettings from '@/services/useSettings';

export type Disabled = undefined | boolean | (() => boolean) | 'need_accounts';

interface PageDescr {
   panels: PanelBaseProps[];
   fa?: string; // font-awesome icon
   url: string;
   disabled?: Disabled;
   invisible?: boolean;

   tmp?: boolean;
   //  If true, the page will be deleted when the user moves away from it
}

interface PagesContext {
   pages: Record<string, PageDescr>;

   // Create a new page, and return its id
   addPage: (
      header: HeaderProps, panels: PanelBaseProps[], tmp?: boolean
      ) => Promise<string>;

   // Delete the page
   deletePage: (name: string) => void;

   // Update an existing page
   updatePage: (name: string, panels: PanelBaseProps[]) => void;
}

const defaultPages: Record<string, PageDescr> = {
   'Overview': {
      url: '/',
      fa: 'fa-tachometer',
      panels: [
         {
            type: 'networth',
            rowspan: 2,
            colspan: 2,
            showValue: true,
            showShares: false,
            showPrice: false,
            roundValues: true,
            showDeltaLast: true,
            threshold: 1e-6,
            dates: ["1 year ago", "1 month ago", "today"],
            treeMode: TreeMode.USER_DEFINED,
         } as NetworthPanelProps,
         {
            type: 'incomeexpenses',
            rowspan: 1,
            colspan: 2,
            expenses: false,
            roundValues: true,
            range: '1 year',
         } as IncomeExpensePanelProps,
         {
            type: 'incomeexpenses',
            rowspan: 1,
            colspan: 2,
            expenses: true,
            roundValues: true,
            range: '1 year',
         } as IncomeExpensePanelProps,
         {
            type: 'metrics',
            range: "1 year",
            roundValues: true,
            rowspan: 4,
            colspan: 2,
         } as CashflowPanelProps,
         {
            type: 'ledger',
            accountIds: 'assets',
            range: 'upcoming',
            notes_mode: NotesMode.ONE_LINE,
            split_mode: SplitMode.COLLAPSED,
            borders: false,
            defaultExpand: false,
            valueColumn: true,
            hideBalance: true,
            hideReconcile: true,
            rowspan: 1,
            colspan: 2,
         } as LedgerPanelProps,
         {
            type: 'mean',
            range: '1 year',
            prior: 2,
            after: 2,
            showExpenses: true,
            showIncome: true,
            showUnrealized: true,
            negateExpenses: true,
            showMean: true,
            rowspan: 2,
            colspan: 2,
         } as MeanPanelProps,
         {
            type: 'nwhist',
            range: 'all',
            prior: 2,
            after: 2,
            rowspan: 1,
            colspan: 2,
         } as NetworthHistoryPanelProps,
      ]
   },

   'Accounts': {
      url: '/accounts',
      fa: 'fa-money',
      disabled: 'need_accounts',
      panels: [
         {
            type: 'accounts',
            colspan: 4,
            rowspan: 1,
         } as AccountsPanelProps,
      ],
   },

   'Networth': {
      url: '/networth',
      fa: 'fa-diamond',
      disabled: 'need_accounts',
      panels: [
         {
            type: 'networth',
            colspan: 4,
            rowspan: 1,
            hidePanelHeader: false,
            showValue: true,
            showShares: false,
            showPrice: false,
            roundValues: false,
            showDeltaLast: true,
            threshold: 1e-6,
            dates: ["1 year ago", "1 month ago", "today"],
            treeMode: TreeMode.USER_DEFINED,
         } as NetworthPanelProps,
      ],
   },

   'Investments': {
      url: '/investments',
      fa: 'fa-bank',
      disabled: 'need_accounts',
      panels: [
         {
            type: 'investments',
            colspan: 4,
            rowspan: 1,
            hideIfNoShare: true,
            showWALine: false,
            showACLine: true,
            range: "1 year",
            asTable: false,
         } as InvestmentsPanelProps,
      ],
   },

   'Performance': {
      url: '/performance',
      fa: 'fa-line-chart',
      disabled: 'need_accounts',
      panels: [
         {
            type: 'performance',
            colspan: 4,
            rowspan: 1,
            hideIfNoShare: true,
            range: "1 year",
         } as PerformancePanelProps,
      ],
   },

   'Budget': {
      url: '/budget',
      fa: 'fa-balance-scale',
      disabled: true,
      panels: [],
   },

   'Payees': {
      url: '/payees',
      fa: 'fa-user',
      disabled: true,
      panels: [],
   },

   'Welcome': {
      url: '/welcome',
      invisible: true,
      panels: [
         {
            type: 'welcome',
            colspan: 4,
            rowspan: 1,
         } as WelcomePanelProps,
      ],
   },

};

const noContext: PagesContext = {
   pages: {},
   addPage: () => Promise.resolve(''),
   deletePage: () => null,
   updatePage: () => null,
}
const ReactPagesContext = React.createContext(noContext);

export const PagesProvider: React.FC<{}> = p => {
   const { val, setVal } = useSettings('Pages', defaultPages);

   const addPage = React.useCallback(
      (header: HeaderProps, panels: PanelBaseProps[], tmp?: boolean) => {
         return new Promise<string>(
            (resolve, reject) => {
               setVal(old => {
                  const name = capitalize(header.name ?? '');
                  let id = name;
                  if (old[id] !== undefined) {
                     for (let index = 0; old[id] !== undefined; index++) {
                        id = `${name}_${index}`;
                     }
                  }

                  const url = `/${id}`;

                  // To avoid a race condition (returning the url before we
                  // have registered the page), we resolve in a timeout.
                  setTimeout(() => resolve(url), 1);

                  return {
                     ...old,
                     [id]: {name: id, panels, url, tmp},
                  };
               });
            }
         );
      },
      [setVal]
   );

   const deletePage = React.useCallback(
      (name: string) => {
         setVal(old => {
            const cp = {...old};
            delete cp[name];
            return cp;
         });
      },
      [setVal]
   );

   const updatePage = React.useCallback(
      (name: string, panels: PanelBaseProps[]) => {
          setVal(old => {
             return {
                ...old,
                [name]: {...old[name], panels},
             };
          });
      },
      [setVal]
   );

   const data = React.useMemo(
      () => ({ pages: val, addPage, deletePage, updatePage }),
      [val, addPage, deletePage, updatePage]
   );

   return (
      <ReactPagesContext.Provider value={data} >
         {p.children}
      </ReactPagesContext.Provider>
   );
}

// Do not use 'export default' here. Otherwise, when we modify this package,
// Vite fails to rerun App/index.tsx and the PageProvider, and we end up with
// an empty list of pages for some reason.
export const usePages = () => React.useContext(ReactPagesContext);
