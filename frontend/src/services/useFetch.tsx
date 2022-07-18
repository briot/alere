import { useQuery, QueryKey, UseQueryOptions, useQueries,
   UseQueryResult } from 'react-query';
import { invoke } from '@tauri-apps/api'

export interface FetchProps<T, RAW_T, TArgs extends Record<string, any>> {
   cmd: string,
   args?: TArgs,
   parse?: (json: RAW_T) => T;  // parse the server's response
   placeholder?: T;
   enabled?: boolean;
   options?: UseQueryOptions<T, string /* error */, T /* TData */>;
   key?: QueryKey;
}

const toQueryProps = <T, RAW_T, TArgs extends Record<string, any>>
(p: FetchProps<T, RAW_T, TArgs>) => ({
   queryKey: p.key ?? [p.cmd, p.args],
   queryFn: async ({ signal }: {signal?: AbortSignal}) => {
      try {
         const json: T | RAW_T = await invoke(p.cmd, p.args);
         return (p.parse === undefined)
            ? json as T
            : p.parse(json as RAW_T);
      } catch (err) {
         window.console.error(err);
         return p.placeholder;
      };
   },
   ...p.options,
   placeholderData: p.placeholder,
   enabled: p.enabled === undefined ? true : p.enabled,
});

/**
 * Wrapper around react-query, to use window.fetch and setup cancellable
 * queries.
 */
const useFetch = <T, RAW_T, TArgs extends Record<string, any>> (
   p: FetchProps<T | undefined, RAW_T, TArgs>
): UseQueryResult<T | undefined, string> => {
   return useQuery(toQueryProps(p));
};

/**
 * Perform multiple queries in parallel
 */
export const useFetchMultiple = <T, RAW_T, TArgs extends Record<string, any>> (
   p: FetchProps<T | undefined, RAW_T, TArgs>[],
): UseQueryResult<T | undefined, string>[] => {
   return useQueries(p.map(toQueryProps));
}

export default useFetch;
