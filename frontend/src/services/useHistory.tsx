import * as React from 'react';
import { AccountId } from 'Transaction';

interface HistoryLine {
   accountId : AccountId;
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

export const HistProvider: React.FC<{}> = p => {
   const [hist, setHist] = React.useState<History>([]);
   const pushAccount = React.useCallback(
      (id: AccountId) => {
         setHist(old => {
            const v = [{accountId: id},
                       ...old.filter(h => h.accountId !== id)];
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

   // On startup, load preferences from local storage
   React.useLayoutEffect(
      () => {
         try {
            const p = [
               ...JSON.parse(localStorage.getItem(KEY) || ''),
            ];
            window.console.log('loaded history:', p);
            setHist(p);
         } catch(e) {
         }
      },
      []
   );

   return (
      <ReactHistContext.Provider value={data}>
         {p.children}
      </ReactHistContext.Provider>
   );
};

const useHistory = () => React.useContext(ReactHistContext);
export default useHistory;
