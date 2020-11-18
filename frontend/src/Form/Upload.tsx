import * as React from "react";
import Spinner from 'Spinner';
import { Button } from 'Form';
import "./Upload.scss";

export interface UploadResult {
   files: File[];   // list of files to import
   success: boolean;
   error: string;
}

interface UploadProps {
   multiple?: boolean;     // do we allow multiple files
   autosubmit?: boolean;   // submit() the form as soon as we have a file

   // Called to perform the upload of the files.
   // It should return at least a success field.
   doUpload: (files: File[]) => Promise<{ success: boolean }>;
}

const Upload: React.FC<UploadProps> = p => {
   const { doUpload } = p;
   const [uploading, setUploading] = React.useState(false);
   const [files, setFiles] = React.useState<File[]>([]);
   const fileInput = React.useRef<HTMLInputElement|null>(null);

   const send = React.useCallback(
      (files: File[]) => {
         setUploading(true);
         doUpload(files).then(
            (res: { success: boolean }) => {
               if (res.success) {
                  setFiles([]);
               }
               setUploading(false);
            }
         );
      },
      [doUpload]
   );

   const addFiles = React.useCallback(
      (files: FileList | null) => {
         if (files && files.length) {
            setFiles(old => {
               let tmp = p.multiple ? [...old] : [];
               for (let f = 0; f < files.length; f++) {
                  tmp.push(files[f]);
               }
               if (p.autosubmit) {
                  send(tmp);
                  tmp = [];
               }
               return tmp;
            });
         }
      },
      [p.multiple, p.autosubmit, send]
   );

   const onFileAdded = React.useCallback(
      () => fileInput.current && addFiles(fileInput.current.files),
      [addFiles]
   );

   const cancelEvent = (e: Event | React.DragEvent<any>) => {
      e.preventDefault();
      e.stopPropagation();
   };

   const onDrop = (e: React.DragEvent<any>) => {
      cancelEvent(e);
      if (e.dataTransfer) {
         addFiles(e.dataTransfer.files);
      }
   };

   const onUpload = () => {
      send(files);
   }

   const hasFiles = files.length !== 0;
   const fileList: JSX.Element = hasFiles ? (
      <ul className="files">
         {files.map(f => (
            <li key={f.name}>{f.name}</li>
         ))}
      </ul>
   ) : (
      <div>
         <span style={{ fontWeight: "bold" }}>Choose a file </span> or drag
         it here
      </div>
   );

   if (uploading) {
      return <Spinner />;
   }

   return (
      <form
         className="uploadForm"
         onDrag={cancelEvent}
         onDragOver={cancelEvent}
         onDragEnter={cancelEvent}
         onDragEnd={cancelEvent}
         onDragLeave={cancelEvent}
         onDrop={onDrop}
      >
         <div className="maxi uploadTarget">
            <label>
               <div className="fa fa-download icon" />
               {fileList}
               <input
                  type="file"
                  multiple={p.multiple}
                  ref={fileInput}
                  onChange={onFileAdded}
               />
            </label>
            <Button
               style={{ marginTop: "20px" }}
               primary={true}
               disabled={!hasFiles}
               text="Upload"
               onClick={onUpload}
            />
         </div>
      </form>
   );
}
export default Upload;
