import { useMutation } from 'react-query';
import useCsrf from 'services/useCsrf';

interface PostProps<RESULT, VARS> {
   url: string;
   onSuccess?: (data: RESULT, vars: VARS) => void,
   onError?: () => void,
}

const usePost = <RESULT, VARS extends FormData|string|undefined> (
   p: PostProps<RESULT, VARS>,
) => {
   const csrf = useCsrf();
   const mutation = useMutation<RESULT, unknown, VARS, unknown>(
      (body: VARS) => window.fetch(p.url, {
            method: "POST",
            headers: new Headers({ "X-CSRFToken": csrf }),
            credentials: "same-origin", //  Send cookies from same origin
            body: body,
         }).then(r => {
            if (!r.ok) {
               throw new Error(`Failed to post ${p.url}`);
            }
            return r.json() as Promise<RESULT>;
         }),
      {
         onSuccess: p.onSuccess,
         onError: p.onError,
      }
   );
   return mutation;
}
export default usePost;
