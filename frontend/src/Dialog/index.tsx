import * as React from 'react';
import './Dialog.scss';

interface DialogProps {
   children: React.ReactNode; // dialog hidden if unknown
   title: string;

   okText?: string;  // button hidden if unspecified
   onok: () => void;

   cancelText?: string;  // button hidden if unspecified
   oncancel?: () => void;

   close_on_bg_click?: boolean;
   // If true, close the dialog when the user clicks
   // outside of it. This behaves like the OK button
}

const Dialog = (p: DialogProps) => {
   const { onok, oncancel } = p;

   /**
    * Close the dialog, and calls the user's callback
    */
   const onclick = React.useCallback(
      (e: React.MouseEvent) => {
         if (p.close_on_bg_click
             && (e.target as Element).id === 'dialogbg'
         ) {
            onok?.();
            e.preventDefault();
            e.stopPropagation();
         }
      },
      [onok, p.close_on_bg_click]
   );

   /**
    * The OK button
    */
   const ok = React.useCallback(
      (e: React.MouseEvent) => {
         onok();
         e.preventDefault();
         e.stopPropagation();
      },
      [onok]
   );

   /**
    * The Cancel button
    */
   const cancel = React.useCallback(
      (e: Event | React.MouseEvent) => {
         oncancel?.();
         e.preventDefault();
         e.stopPropagation();
      },
      [oncancel]
   );

   /**
    * Handle key press
    */
   const onkey = React.useCallback(
      (e: KeyboardEvent) => {
         if (e.code === "Escape") {
            cancel(e);
         }
      },
      [cancel]
   );

   React.useEffect(
      () => {
         window.addEventListener("keypress", onkey);
         return () => {
            window.removeEventListener("keypress", onkey);
         };
      },
      [onkey]
   );

   if (!p.children) {
      return null;
   }

   return (
      <div id="dialogbg" onClick={onclick} >
         <div className='dialog' >
            <h4>{p.title}</h4>
            <div className='content'>
               {p.children}
            </div>
            <div className='buttons'>
               {
                   p.cancelText && p.oncancel &&
                   <button type='button' onClick={cancel} >
                      {p.cancelText}
                   </button>
               }
               {
                   p.okText &&
                   <button type='button' className='primary' onClick={ok}>
                      {p.okText}
                   </button>
               }
            </div>
         </div>
      </div>
   )

}
export default Dialog;
