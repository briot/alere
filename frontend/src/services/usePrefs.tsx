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
}

export interface Preferences {
   ledgers: LedgerPrefs;
}

const defaultPref: Preferences = {
   ledgers: {
      trans_mode: TransactionMode.ONE_LINE,
      split_mode: SplitMode.COLLAPSED,
      borders: false,
      defaultExpand: true,
      valueColumn: false,
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

const PrefContext = React.createContext(noContext);
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
            const p = JSON.parse(localStorage.getItem(KEY) || '');
            window.console.log('loaded preferences:', p);
            setPrefs(p);
         } catch(e) {
         }
      },
      []
   );

   return (
      <PrefContext.Provider value={data}>
         {p.children}
      </PrefContext.Provider>
   );
};

const usePrefs = () => React.useContext(PrefContext);
export default usePrefs;
