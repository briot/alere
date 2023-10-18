import { useQuery, UseQueryOptions, useQueries,
   UseQueryResult } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api'

export interface FetchProps<T, RAW_T, TArgs extends Record<string, any>> {
   cmd: string,
   args?: TArgs,
   parse?: (json: RAW_T) => T;  // parse the server's response
   enabled?: boolean;
   options?: Omit<
      UseQueryOptions<T, string /* error */, T /* TData */>,
      "queryKey"    // Automatically computed from cmd and args
   >,
}

const toQueryProps = <T, RAW_T, TArgs extends Record<string, any>>
(p: FetchProps<T, RAW_T, TArgs>) => ({
   queryKey: [p.cmd, p.args],
   queryFn: async () => {
      try {
         const json: T | RAW_T = await invoke(p.cmd, p.args);
         window.console.log(p.cmd, "=>", json);
         return (p.parse === undefined)
            ? json as T
            : p.parse(json as RAW_T);
      } catch (err) {
         window.console.error(err);
         return undefined;
      };
   },
   ...p.options,
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
   return useQueries({
      queries: p.map(toQueryProps),
   });
}

export default useFetch;
