import * as React from 'react';
import { AccountId } from '@/services/useAccounts';

interface HistoryLine {
   accountId: AccountId;
}

type History = HistoryLine[];

interface HistContext {
   hist: History;
   pushAccount: (id: AccountId | undefined) => void;
   mostRecent: AccountId | undefined;
}
const noContext: HistContext = {
   hist: [],
   pushAccount: () => {},
   mostRecent: undefined,
};

const ReactHistContext = React.createContext(noContext);
const KEY = "alereHist";
const MAX_ENTRIES = 10;

interface HistProviderProps {
   children?: React.ReactNode;
}

export const HistProvider: React.FC<HistProviderProps> = p => {
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
      (id: AccountId | undefined) => {
         setHist(old => {
            if (id === undefined || old[0]?.accountId === id) {
               return old;
            }
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
      () => ({ hist, pushAccount, mostRecent: hist?.[0]?.accountId }),
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
