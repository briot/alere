/**
 * A hook that lists all the pages that should be listed in the left side
 * panel.
 */
import * as React from 'react';
import type { AccountsPanelProps } from '@/Accounts/Panel';
import { AccountEditPanelProps } from '@/AccountEdit/Panel';
import { CashflowPanelProps } from '@/Cashflow/Panel';
import { IncomeExpensePanelProps } from '@/IncomeExpense/Panel';
import { InvestmentsPanelProps } from '@/Investments/Panel';
import { LedgerPanelProps } from '@/Ledger/Panel';
import { LedgerPageTitle } from '@/LedgerPage';
import { MeanPanelProps }  from '@/Mean/Panel';
import { MetricsPanelProps } from '@/Metrics/Panel';
import { NetworthHistoryPanelProps } from '@/NWHistory/Panel';
import { NetworthPanelProps } from '@/NetWorth/Panel';
import { AssetsPanelProps } from '@/Assets/Panel';
import { PanelBaseProps } from '@/Dashboard/Panel';
import { PerformancePanelProps } from '@/Performance/Panel';
import { PriceHistoryPanelProps } from '@/PriceHistory/Panel';
import { RecentPanelProps } from '@/Recent/Panel';
import { SplitMode, NotesMode } from '@/Ledger/View';
import { TickerPanelProps } from '@/Ticker/Panel';
import { TreeMode } from '@/services/useAccountTree';
import { WelcomePanelProps } from '@/Welcome/Panel';
import { toDates } from '@/Dates';
import useSettings from '@/services/useSettings';

export type Disabled = undefined | boolean | (() => boolean) | 'need_accounts';
// type Overrides = { [panel: string]: Partial<PanelBaseProps>};

interface PageDescr {
   panels: PanelBaseProps[];  // in the central area
   headerNode?: () => React.ReactNode;

   right?: PanelBaseProps[] | null;
   // in the right area. If null then no right area is displayed.
   // If undefined, it uses the panels from the right side of the first page
   // that defines right panels (in general the Overview).

   fa?: string; // font-awesome icon
   url: string;
   name: string;      // displayed next to the button in left-side bar
   tooltip?: string;  // defaults to name

   disabled?: Disabled;
   invisible?: boolean;

   tmp?: boolean;
   //  If true, the page will be deleted when the user moves away from it
}

const noPage: PageDescr = {
   panels: [],
   name: '',
   url: '',
}

const defaultPages: PageDescr[] = [
   {
      name: 'Overview',
      url: '/',
      fa: 'fa-tachometer',
      right: [
         {
            type: 'recent',
            colspan: 1,
            rowspan: 3,
         } as RecentPanelProps,
         {
            type: 'assets',
            range: "1 year",
            roundValues: true,
            rowspan: 1,
            colspan: 1,
         } as AssetsPanelProps,
      ],
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
            rowspan: 2,
            colspan: 2,
         } as MetricsPanelProps,
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
            type: 'cashflow',
            range: "1 year",
            roundValues: true,
            rowspan: 2,
            colspan: 2,
         } as CashflowPanelProps,
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

   {
      name: 'Ledger',
      url: '/ledger',
      fa: 'fa-book',
      disabled: 'need_accounts',
      panels: [
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
            range: "all",
            dateRange: toDates("all"),
         } as TickerPanelProps,
         {
            type: 'ledger',
            notes_mode: NotesMode.ONE_LINE,
            split_mode: SplitMode.COLLAPSED,
            borders: false,
            defaultExpand: false,
            valueColumn: false,
            hideBalance: false,
            hideReconcile: false,
            rowspan: 4,
            colspan: 4,
         } as LedgerPanelProps,
      ]
   },

   {
      name: 'Accounts',
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

   {
      name: 'Networth',
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

   {
      name: 'Investments',
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

   {
      name: 'Performance',
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

   {
      name: 'Budget',
      url: '/budget',
      fa: 'fa-balance-scale',
      disabled: true,
      panels: [],
   },

   {
      name: 'Payees',
      url: '/payees',
      fa: 'fa-user',
      disabled: true,
      panels: [],
   },

   {
      name: 'Welcome',
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

   {
      name: 'Edit Accounts',
      url: '/accountEdit',
      invisible: true,
      panels: [
         {
            type: 'accountedit',
            colspan: 4,
            rowspan: 1,
         } as AccountEditPanelProps,
      ],
   },
];

/**
 * Return the name of the page that contains the right panels list, that are
 * used by the page `name`
 */
const pageForRight = (
   pages: Record<string, PageDescr>,
   page: PageDescr,
): PageDescr|undefined => {
   return page.right === undefined  // either no page, or inherit right
      ? Object.values(pages).filter(p => p.right)[0]
      : page.right === null      // No right panels
      ? undefined
      : page;
};

type Area = "central" | "right";

interface PagesContext {
   // Return the url of all visible pages
   allVisiblePages: () => PageDescr[],

   // Return the panels to display in either the central area or the right
   // area, for the given page
   getPanels: (page: PageDescr, area: Area) => PanelBaseProps[];

   // Create a new page, and return its id
   addPage: (
      name: string, url: string, panels: PanelBaseProps[], tmp?: boolean
      ) => Promise<string>;

   // Delete the page
   deletePage: (page: PageDescr) => void;

   // Update an existing page
   updatePage: (page: PageDescr, panels: PanelBaseProps[], area?: Area) => void;

   // Find an existing page
   getPage: (url: string) => PageDescr,
}

const hideTmp = (pages: PageDescr[]) => pages.filter(p => !p.tmp);

const noContext: PagesContext = {
   allVisiblePages: () => [],
   getPanels: () => [],
   addPage: () => Promise.resolve(''),
   deletePage: () => null,
   updatePage: () => null,
   getPage: () => noPage,
}
const ReactPagesContext = React.createContext(noContext);

export const PagesProvider: React.FC<{}> = p => {
   const { val, setVal } = useSettings<PageDescr[]>(
      'Pages', defaultPages, hideTmp /* loader */ );
   const dict: Record<string, PageDescr> = React.useMemo(
      () => {
         const r: Record<string, PageDescr> = {}
         defaultPages.forEach(p => r[p.url] = p);
         val.forEach(p => r[p.url] = p);  // override if needed

         // Special case for the header of some pages
         // ??? Should be part of the description
         r['/ledger'].headerNode = () => <LedgerPageTitle />;

         return r;
      },
      [val]
   );

   const addPage = React.useCallback(
      (name: string, url: string, panels: PanelBaseProps[], tmp?: boolean) => {
         if (url[0] !== '/') {
            window.console.error('Invalid url', url);
         }

         return new Promise<string>(
            (resolve, reject) => {
               setVal(old => {
                  const doesNotExists = (id: string) =>
                      old.find(p => p.url === id) === undefined;

                  let id = url;
                  if (!doesNotExists(id)) {
                     for (let index = 0; ; index++) {
                        id = `${url}_${index}`;
                        if (doesNotExists(id)) {
                           break;
                        }
                     }
                  }

                  // To avoid a race condition (returning the url before we
                  // have registered the page), we resolve in a timeout.
                  setTimeout(() => resolve(url), 0);

                  return [
                     ...old,
                     {panels, name, url: id, tmp},
                  ];
               });
            }
         );
      },
      [setVal]
   );

   const deletePage = React.useCallback(
      (page: PageDescr) => setVal(old => old.filter(p => p.url !== page.url)),
      [setVal]
   );

   const updatePage = React.useCallback(
      (page: PageDescr, panels: PanelBaseProps[], area: Area="central") =>
         setVal(old => {
            const obj = area === "central" ? {panels} : {right: panels};
            const page_to_change: PageDescr =
               area === "central"
               ? page
               : pageForRight(dict, page) ?? page;
            return old.map(p =>
               p === page_to_change
               ? {...page_to_change, ...obj}
               : p
            );
         }),
      [setVal, dict]
   );

   const getPage = React.useCallback(
      (url: string) => dict[url] ?? noPage,
      [dict]
   );

   const getPanels = React.useCallback(
      (page: PageDescr, area: Area) => {
         const n = area === "central" ? page : pageForRight(dict, page);
         return n === undefined
            ? []
            : area === "central"
            ? (n.panels || [])
            : (n.right || []);
      },
      [dict]
   );

   const allVisiblePages = React.useCallback(
      () => val.filter(p => !p.invisible),
      [val]
   );

   const data = React.useMemo<PagesContext>(
      () => ({
         allVisiblePages, getPanels, addPage, deletePage, updatePage, getPage,
      }),
      [allVisiblePages, getPanels, addPage, deletePage, updatePage, getPage]
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
