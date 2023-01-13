import React from 'react';
import usePost from '@/services/usePost';

const useOnlineUpdate = () => {
   const mutation = usePost<{}, {}>('onlineUpdate');
   const update = React.useCallback(
      () => mutation.mutate({}),
      [mutation]
   );

   return { update };
}

export default useOnlineUpdate;
