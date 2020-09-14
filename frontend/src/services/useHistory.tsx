import * as React from 'react';
import { AccountId } from 'services/useAccounts';

interface HistoryLine {
   accountId: AccountId;
}

type History = HistoryLine[];

interface HistContext {
   hist: History;
   pushAccount: (id: AccountId) => void;
}
const noContext: HistContext = {
   hist: [],
   pushAccount: () => {},
};

const ReactHistContext = React.createContext(noContext);
const KEY = "alereHist";
const MAX_ENTRIES = 10;

export const HistProvider: React.FC<{}> = p => {
   const [hist, setHist] = React.useState<History>(
      () => {
         // On startup, load preferences from local storage
         try {
            return [...JSON.parse(localStorage.getItem(KEY) || '')];
         } catch(e) {
            return [];
         }
      }
   );

   const pushAccount = React.useCallback(
      (id: AccountId) => {
         setHist(old => {
            const v = [{accountId: id },
                       ...old.filter(h => h.accountId !== id)]
               .slice(0, MAX_ENTRIES);
            localStorage.setItem(KEY, JSON.stringify(v));
            window.console.log('update history');
            return v;
         });
      },
      []
   );

   const data = React.useMemo(
      () => ({ hist, pushAccount }),
      [hist, pushAccount]
   );

   return (
      <ReactHistContext.Provider value={data}>
         {p.children}
      </ReactHistContext.Provider>
   );
};

const useHistory = () => React.useContext(ReactHistContext);
export default useHistory;
