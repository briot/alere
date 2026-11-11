import React from 'react';
import RoundButton from '@/RoundButton';
import usePost from '@/services/usePost';
import { useQueryClient } from 'react-query';


const OnlineUpdate: React.FC<{}> = () => {
   const client = useQueryClient();
   const mutation = usePost<{}, string>({
      url: '/api/online',
      onSuccess: () => {
         // Invalidate queries. This automatically forces an update of all
         // useFetch, no need to do anything else.
         window.console.log('invalidate queries');
         client.invalidateQueries();
      },
      onError: () => window.console.log('MANU updating failed'),
   });
   const update = React.useCallback(
      () => {
         window.console.log('MANU update');
         mutation.mutate('');
      },
      [mutation]
   );

   return (
      <RoundButton
         fa='fa-refresh'
         size='small'
         tooltip='update prices from online sources. This includes closing prices from the previous day, not necessarily the current price.'
         onClick={update}
         disabled={mutation.isLoading}
      />
   );
}
export default OnlineUpdate;
