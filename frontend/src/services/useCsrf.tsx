import * as React from 'react';

/**
 * The security token required by Django
 */
const useCsrf = () => {
   const [csrf, setCsrf] = React.useState('');
   React.useEffect(
      () => {
         const name = "csrftoken=";
         if (document.cookie) {
            const cookies = document.cookie.split(";");
            for (const c of cookies) {
               if (c.trim().startsWith(name)) {
                  const val = c.substring(name.length);
                  setCsrf(decodeURIComponent(val));
                  break;
               }
            }
         }
      },
      []
   );
   return csrf;
}
export default useCsrf;
