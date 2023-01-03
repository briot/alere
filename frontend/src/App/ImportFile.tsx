import * as React from 'react';
import Dialog from '@/Dialog';
import { save, open } from "@tauri-apps/api/dialog";
//  import { readTextFile } from "@tauri-apps/api/fs";
import { SharedInput } from '@/Form/';

interface ImportFileProps {
   onclose: () => void;
}

const ImportFile: React.FC<ImportFileProps> = p => {
   const [fileName, setFileName] = React.useState('');
   const [importFrom, setImportFrom] = React.useState('');

   const select_file = React.useCallback(
      async (e: React.MouseEvent) => {
         e.stopPropagation();
         e.preventDefault();
         let filepath = await save();
         if (typeof filepath == 'string') {
            setFileName(filepath);
         }
//               let content = await readTextFile(filepath);
//               window.console.log('MANU read text',
//                  content.length, ' bytes from ', filepath);
      },
      [setFileName]
   );

   const select_imported = React.useCallback(
      async (e: React.MouseEvent) => {
         e.stopPropagation();
         e.preventDefault();
         let filepath = await open();
         if (typeof filepath == 'string') {
            setImportFrom(filepath);
         }
      },
      [setImportFrom]
   );

   return (
      <Dialog
         title='New File'
         close_on_bg_click={false}
         onok={p.onclose}
         okText='Create'
         oncancel={p.onclose}
         cancelText='Cancel'
      >
         <form>
            <SharedInput className="input" text="File Name" >
               <input readOnly={true} type="text" value={fileName} />
               <button onClick={select_file}>Browse</button>
            </SharedInput>
            <fieldset>
               <legend>
                  Import from
                  <select style={{marginLeft: 10}} >
                     <option>None</option>
                     <option>KMyMoney</option>
                  </select>
               </legend>
               <SharedInput className="input" text="From" >
                  <input readOnly={true} value={importFrom} type="text" />
                  <button onClick={select_imported}>Browse</button>
               </SharedInput>
            </fieldset>
         </form>
      </Dialog>
   );
}

export default ImportFile;
