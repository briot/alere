import * as React from 'react';
import Upload from 'Form/Upload';
import useAccounts from 'services/useAccounts';
import usePost from 'services/usePost';
import './Welcome.scss';

enum Mode {
   CHOICES,
   KMYMONEY,
}

export interface WelcomeProps {
}

const Welcome: React.FC<WelcomeProps> = p => {
   const [mode, setMode] = React.useState(Mode.CHOICES);
   const { refresh } = useAccounts();
   const importer = usePost({
      url: '/api/import/kmymoney',
      onSuccess: refresh,
      onError: () => {
         throw new Error("Could not upload file");
      },
   });
   const onKMyMoney = () => {
      setMode(Mode.KMYMONEY);
   }
   const uploadKMyMoney = (files: File[]) => {
      const data = new FormData();
      files.forEach(f => data.append("file", f));
      importer.mutate(data);
   }

   return (
      <div className="welcome">
         <h1>Start importing accounts</h1>
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

             <button onClick={onKMyMoney} >
                <b>
                   <img
                      src="https://kmymoney.org/assets/img/app_icon.png"
                      height="40px"
                      alt=""
                   />
                   Kmymoney
                </b>
                <p>
                   If you are currently
                   using <a href="https://kmymoney.org/" target="_">Kmymoney</a> with
                   a sql file, you can import this directly
                </p>
             </button>

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
            mode === Mode.KMYMONEY &&
            <div>
               <h1>Import from KMyMoney</h1>
               <Upload doUpload={uploadKMyMoney} autosubmit={false} />
            </div>
         }
      </div>
   );
}
export default Welcome;
