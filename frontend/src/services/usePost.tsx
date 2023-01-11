import { useMutation } from '@tanstack/react-query';
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
   cmd: string;
   onSuccess?: (data: RESULT, vars: VARS) => void,
   onError?: () => void,
}

const usePost = <RESULT, VARS extends {}|undefined> (
   p: PostProps<RESULT, VARS>,
) => {
   const mutation = useMutation<RESULT, unknown, VARS, unknown>(
      async (body: VARS) => {
         const json: RESULT = await invoke(p.cmd, body);
         return json;
      },
      {
         onSuccess: p.onSuccess,
         onError: p.onError,
      }
   );
   return mutation;
}
export default usePost;
