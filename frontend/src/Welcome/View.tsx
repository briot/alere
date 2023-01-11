import * as React from 'react';
//  import Upload from '@/Form/Upload';
//  import usePost from '@/services/usePost';
import useAccounts from '@/services/useAccounts';
//  import { useQueryClient } from '@tanstack/react-query';
import './Welcome.scss';

enum Mode {
   CHOICES,
   KMYMONEY,
}

export interface WelcomeProps {
}

const Welcome: React.FC<WelcomeProps> = p => {
   const [mode, setMode] = React.useState(Mode.CHOICES);
//   const client = useQueryClient();
//   const importer = usePost({
//      url: '/api/import/kmymoney',
//      onSuccess: () => client.invalidateQueries(),
//      onError: () => {
//         throw new Error("Could not upload file");
//      },
//   });
//   const onKMyMoney = () => {
//      setMode(Mode.KMYMONEY);
//   }
//   const uploadKMyMoney = (files: File[]) => {
//      const data = new FormData();
//      files.forEach(f => data.append("file", f));
//      importer.mutate(data);
//   }

   const { accounts } = useAccounts();
   const has_accounts = accounts.has_accounts();

   return (
      <div className="welcome">
         <h1>Start importing accounts</h1>
         {
            has_accounts &&
            <div>
               You already have existing accounts. Importing would destroy
               your database.
            </div>
         }

         <div className="importtypes">
             <button disabled={true}>
                <b>Manual</b>
                <p>
                   Let's you set up everything step by step
                </p>
             </button>

             <button disabled={true}>
                <b>Internet banking</b>
                <p>
                   If your bank is supported, you can directly import all your
                   accounts and their current balance.
                </p>
             </button>

{
//             <button disabled={has_accounts} onClick={onKMyMoney} >
//                <b>
//                   <img
//                      src="https://kmymoney.org/assets/img/app_icon.png"
//                      height="40px"
//                      alt=""
//                   />
//                   Kmymoney
//                </b>
//                <p>
//                   If you are currently
//                   using <a href="https://kmymoney.org/" target="_">Kmymoney</a> with
//                   a sql file, you can import this directly
//                </p>
//             </button>
            }

             <button disabled={true}>
                <b>QIF file</b>
                <p>
                    Many accounting software let you export your data as QIF
                    files (account by account).
                </p>
             </button>

             <button disabled={true}>
                <b>OFX file</b>
                <p>
                    A better format that avoids duplicates
                </p>
             </button>

             <button disabled={true}>
                <b>CSV file</b>
                <p>
                    At worse, you can fall back to using CSV file
                </p>
             </button>
         </div>

         {
//            mode === Mode.KMYMONEY &&
//            <div>
//               <h1>Import from KMyMoney</h1>
//               <Upload doUpload={uploadKMyMoney} autosubmit={false} />
//            </div>
         }
      </div>
   );
}
export default Welcome;
