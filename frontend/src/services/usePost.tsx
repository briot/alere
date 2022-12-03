import { useMutation } from '@tanstack/react-query';
import useCsrf from '@/services/useCsrf';

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
   url: string;
   onSuccess?: (data: RESULT, vars: VARS) => void,
   onError?: () => void,
}

const usePost = <RESULT, VARS extends FormData|{}|string|undefined> (
   p: PostProps<RESULT, VARS>,
) => {
   const csrf = useCsrf();
   const mutation = useMutation<RESULT, unknown, VARS, unknown>(
      async (body: VARS) => {
         const isFormData = body instanceof FormData;
         const r = await window.fetch(
            p.url,
            {
               method: "POST",
               headers: new Headers({
                  "X-CSRFToken": csrf,
                  "Content-Type":
                      isFormData ? "multipart/form-data" : "application/json",

               }),
               credentials: "same-origin", //  Send cookies from same origin
               body: isFormData ? body : JSON.stringify(body),
            }
         );
         if (!r.ok) {
            window.console.error(r);
            throw new Error(`Failed to post ${p.url}`);
         }
         return r.json() as Promise<RESULT>;
      },
      {
         onSuccess: p.onSuccess,
         onError: p.onError,
      }
   );
   return mutation;
}
export default usePost;
