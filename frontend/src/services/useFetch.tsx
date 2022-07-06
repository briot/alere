import { useQuery, QueryKey, UseQueryOptions, useQueries,
   UseQueryResult } from 'react-query';

export interface FetchProps<T, RAW_T> {
   url: string;
   init?: RequestInit;  // To override the method, for instance
   parse?: (json: RAW_T) => T;  // parse the server's response
   placeholder: T;
   enabled?: boolean;
   options?: UseQueryOptions<T, string /* error */, T /* TData */>;
   key?: QueryKey;
}

const toQueryProps = <T, RAW_T> (p: FetchProps<T, RAW_T>) => ({
   queryKey: p.key ?? p.url,
   queryFn: async ({ signal }: {signal?: AbortSignal}) => {
      const promise = window.fetch(
         p.url,
         {...p.init, signal},
      ).then(r => {
         if (!r.ok) {
            throw new Error(`Failed to fetch ${p.url}`);
         }
         return r.json();
      }).then(json => {
         return (!p.parse) ? json as T : p.parse(json);
      }).catch(err => {
         window.console.error('Error while loading', p.url, err);
         return p.placeholder;
      });
      return promise;
   },
   ...p.options,
   placeholderData: p.placeholder,
   enabled: p.enabled === undefined ? true : p.enabled,
});

/**
 * Wrapper around react-query, to use window.fetch and setup cancellable
 * queries.
 */
const useFetch = <T, RAW_T> (
   p: FetchProps<T, RAW_T>
): UseQueryResult<T, string> => {
   const resp = useQuery(toQueryProps(p));
   return resp;
};

/**
 * Perform multiple queries in parallel
 */
export const useFetchMultiple = <T, RAW_T> (
   p: FetchProps<T, RAW_T>[],
): UseQueryResult<T, string>[] => {
   const resp = useQueries(p.map(toQueryProps));
   return resp;
}

export default useFetch;
