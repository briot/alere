import * as React from 'react';

interface FetchProps<T> {
   url: string;
   init?: RequestInit,  // To override the method, for instance
//   parse?: (json: any) => T;  // parse the server's response
   default: T;
}

// Only one of the fields is set
interface FetchState {
   loading?: boolean;
   error?: Error|string;
}

const useFetch = <T extends any> (p: FetchProps<T>) => {
   const [state, setState] = React.useState<FetchState>({loading: true});
   const [json, setJson] = React.useState(p.default);
   const controller = React.useRef<AbortController|undefined>();

   const abort = React.useCallback(
      () => {
         controller.current?.abort();
         controller.current = undefined;
         setState({});
      },
      []
   );

   React.useEffect(
      () => {
         const doFetch = async() => {
            abort();
            controller.current = new AbortController();

            try {
               setState({ loading: true });
               const resp  = await window.fetch(
                  p.url,
                  {...p.init, signal: controller.current.signal}
               );

               if (!resp.ok) {
                  setState({
                     error: `Error loading ${p.url}: ${resp.status}`,
                  });
               } else {
                  const d: T = await resp.json();
                  setJson(d);
                  setState({});
               }
            } catch(e) {
               setState({ error: e });
            }
         }
         doFetch();
         return () => abort();
      },
      [p.url, p.init, abort]
   );

   return {abort, json, state};
}
export default useFetch;
