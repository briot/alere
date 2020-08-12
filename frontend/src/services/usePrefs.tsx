import * as React from 'react';

export enum SplitMode {
   HIDE,       // never show the splits
   SUMMARY,    // only one line for all splits (when more than two)
   COLLAPSED,  // same as multiline, but do not show splits if there are only
               // two accounts involved
   OTHERS,     // same as multiline, but omit current account's splits
   MULTILINE,  // one line per split in a transaction
}

export enum TransactionMode {
   ONE_LINE,   // only use one line (notes are never displayed)
   AUTO,       // transactions use two lines if they have notes
   TWO_LINES,  // transactions always use two lines (to show notes)
}

export interface LedgerPrefs {
   trans_mode: TransactionMode;
   split_mode: SplitMode;
   borders: boolean;
   defaultExpand: boolean;
   valueColumn: boolean;
   hideBalance: boolean;
   hideReconcile: boolean;
}

export interface Preferences {
   dark_mode: boolean;
   currencyId: string;
   ledgers: LedgerPrefs;
}

const defaultPref: Preferences = {
   currencyId: "EUR",
   dark_mode: true,
   ledgers: {
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
      borders: false,
      defaultExpand: true,
      valueColumn: false,
      hideBalance: false,
      hideReconcile: false,
   },
}

interface PrefContext {
   prefs: Preferences;
   updatePrefs: (p: Partial<Preferences>) => void;
}
const noContext: PrefContext = {
   prefs: defaultPref,
   updatePrefs: () => {},
};

const ReactPrefContext = React.createContext(noContext);
const KEY = "alerePrefs";

export const PrefProvider: React.FC<{}> = p => {
   const [prefs, setPrefs] = React.useState(defaultPref);
   const updatePrefs = React.useCallback(
      (p: Partial<Preferences>) => {
         setPrefs(old => {
            const v = {...old, ...p};
            localStorage.setItem(KEY, JSON.stringify(v));
            window.console.log('update prefs', v);
            return v;
         });
      },
      []
   );
   const data = React.useMemo(
      () => ({ prefs, updatePrefs }),
      [prefs, updatePrefs]
   );

   // On startup, load preferences from local storage
   React.useEffect(
      () => {
         try {
            const p = {
               ...defaultPref,
               ...JSON.parse(localStorage.getItem(KEY) || ''),
            };
            window.console.log('loaded preferences:', p);
            setPrefs(p);
         } catch(e) {
         }
      },
      []
   );

   return (
      <ReactPrefContext.Provider value={data}>
         {p.children}
      </ReactPrefContext.Provider>
   );
};

const usePrefs = () => React.useContext(ReactPrefContext);
export default usePrefs;
