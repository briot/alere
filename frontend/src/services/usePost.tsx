import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api'
// import type { InvokeArgs } from '@tauri-apps/api/tauri';

/**
 * Returns a mutation object that can be used to perform POST queries to
 * the server. It automatically adds the CSRF token.
 * The resulting object has a number of properties:
 *    * mutate(body: VARS)
 *      This function emits the query to the server with the given parameters.
 *    * mutateAsync(body: VARS)
 *      Same as above but returns a promise that can be await-ed
 *    * isError:  whether the mutation is in an error state
 *    * isLoading: whether the mutation is loading.
 *    * ...
 */

interface PostProps<RESULT, VARS> {
   onSuccess?: (data: RESULT, vars: VARS) => void,
   onError?: () => void,
}

const usePost = <RESULT, VARS extends {}|undefined> (
   cmd: string,
   p?: PostProps<RESULT, VARS>,
) => {
   const queries = useQueryClient();
   const mutation = useMutation<RESULT, unknown, VARS, unknown>({
         mutationFn: async (body: VARS) => {
            const json: RESULT = await invoke(cmd, body);
            return json;
         },
         onSuccess: (data: RESULT, vars: VARS) => {
            // On success, invalidate all caches, since the kind of accounts
            // might impact a lot of queries, for instance.
            window.console.log('invalidate queries');
            queries.invalidateQueries();

            p?.onSuccess?.(data, vars);
         },
         onError: () => {
            p?.onError?.();
         },
      }
   );
   return mutation;
}
export default usePost;
