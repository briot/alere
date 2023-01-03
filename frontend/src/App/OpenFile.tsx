import * as React from 'react';
import Dialog from '@/Dialog';
import { open } from "@tauri-apps/api/dialog";
import { SharedInput } from '@/Form/';

interface OpenFileProps {
   onclose: () => void;
}

const OpenFile: React.FC<OpenFileProps> = p => {
   const [fileName, setFileName] = React.useState('');

   const select_file = React.useCallback(
      async (e: React.MouseEvent) => {
         e.stopPropagation();
         e.preventDefault();
         let filepath = await open();
         if (typeof filepath == 'string') {
            setFileName(filepath);
         }
      },
      [setFileName]
   );

   return (
      <Dialog
         title='Open File'
         close_on_bg_click={false}
         onok={p.onclose}
         okText='Import'
         oncancel={p.onclose}
         cancelText='Cancel'
      >
         <form>
            <SharedInput className="input" text="File Name" >
               <input readOnly={true} type="text" value={fileName} />
               <button onClick={select_file}>Browse</button>
            </SharedInput>
         </form>
      </Dialog>
   );
}

export default OpenFile;
