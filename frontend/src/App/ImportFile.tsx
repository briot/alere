import * as React from 'react';
import Dialog from '@/Dialog';
import { save, open } from "@tauri-apps/api/dialog";
import { SharedInput, Select } from '@/Form/';
import usePost from '@/services/usePost';

interface NewFileParams {
   name: string,     // name of file to create
   kind: string,     // importer to use
   source: string,   // name of file to import
}

interface ImportFileProps {
   onclose: () => void;
}

const ImportFile: React.FC<ImportFileProps> = p => {
   const { onclose } = p;
   const [fileName, setFileName] = React.useState('');
   const [importKind, setImportKind] = React.useState('none');
   const [importFrom, setImportFrom] = React.useState('');

   const post = usePost<boolean, NewFileParams>({
      cmd: 'new_file',
      // onSuccess:
      onError: () => alert('Failed to import'),
   });

   const on_import = React.useCallback(
      () => {
         post.mutate({
            name: fileName,
            kind: importKind,
            source: importFrom,
         });
         onclose();
      },
      [onclose, fileName, importKind, importFrom, post]
   );

   const onKindChange = React.useCallback(
      (kind: string) => {
         setImportKind(kind);
      },
      []
   );

   const select_file = React.useCallback(
      async (e: React.MouseEvent) => {
         e.stopPropagation();
         e.preventDefault();
         let filepath = await save();
         if (typeof filepath == 'string') {
            setFileName(filepath);
         }
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
         onok={on_import}
         okText='Create'
         oncancel={p.onclose}
         cancelText='Cancel'
      >
         <form>
            <SharedInput className="input" text="File Name" >
               <input readOnly={true} type="text" value={fileName} />
               <button onClick={select_file}>Browse</button>
            </SharedInput>
            <Select
               text="Initial"
               onChange={onKindChange}
               value={importKind}
               options={[
                  {value: 'none', text: 'Create empty file'},
                  {value: 'kmymoney', text: 'Import from KMyMoney'},
               ]}
            />
            <SharedInput
               className="input"
               text="Source"
               disabled={importKind === 'none'}
            >
               <input
                  readOnly={true}
                  value={importFrom}
                  type="text"
               />
               <button
                  onClick={select_imported}
               >
                  Browse
               </button>
            </SharedInput>
         </form>
      </Dialog>
   );
}

export default ImportFile;
