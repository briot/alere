import { useQuery, QueryKey, UseQueryOptions,
   UseQueryResult } from 'react-query';

interface FetchProps<T, RAW_T> {
   url: string;
   init?: RequestInit;  // To override the method, for instance
   parse?: (json: RAW_T) => T;  // parse the server's response
   placeholder?: T;
   enabled?: boolean;
   options?: UseQueryOptions<T, string /* error */, T /* TData */>;
   key?: QueryKey;
}

/**
 * Wrapper around react-query, to use window.fetch and setup cancellable
 * queries.
 */
const useFetch = <T, RAW_T> (
   p: FetchProps<T, RAW_T>
): UseQueryResult<T, string> => {
   const resp = useQuery(
      p.key || p.url,
      async () => {
         const controller = new AbortController();
         const promise = window.fetch(
            p.url,
            {...p.init, signal: controller.signal},
         ).then(r => {
            if (!r.ok) {
               throw new Error(`Failed to fetch ${p.url}`);
            }
            return r.json();
         }).then(json => {
            return (!p.parse) ? json as T : p.parse(json);
         });
//         (promise as unknown).cancel = () => controller.abort();  //  for react-query
         return promise;
      },
      {
         ...p.options,
         placeholderData: p.placeholder,
         enabled: p.enabled === undefined ? true : p.enabled,
      },
   );
   return resp;
};

export default useFetch;
