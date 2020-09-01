import * as React from 'react';

export interface Preferences {
   dark_mode: boolean;
   currencyId: string;
}

const defaultPref: Preferences = {
   currencyId: "EUR",
   dark_mode: true,
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
