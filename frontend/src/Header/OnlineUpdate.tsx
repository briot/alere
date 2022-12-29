import React from 'react';
import usePost from '@/services/usePost';
import { useQueryClient } from '@tanstack/react-query';

const useOnlineUpdate = () => {
   const client = useQueryClient();
   const mutation = usePost<{}, string>({
      url: '/api/online',
      onSuccess: () => {
         // Invalidate queries. This automatically forces an update of all
         // useFetch, no need to do anything else.
         window.console.log('invalidate queries');
         client.invalidateQueries();
      },
      onError: () => window.console.log('updating failed'),
   });
   const update = React.useCallback(
      () => mutation.mutate(''),
      [mutation]
   );

   return { update };
}

export default useOnlineUpdate;
