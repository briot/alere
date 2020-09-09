import * as React from 'react';
import './Dropdown.scss';

interface DropdownProps {
   // button: (onClick: () => void) => React.ReactNode;
   // menu: () => React.ReactNode;
   button: React.ReactNode;
   menu: () => React.ReactNode;
   className?: string;
}

const Dropdown: React.FC<DropdownProps> = p => {
   const [visible, setVisible] = React.useState(false);
   const widget = React.useRef<HTMLDivElement>(null);

   const onToggle = React.useCallback(
      () => setVisible(old => !old),
      []
   );

   const onMouse = React.useCallback(
      (e : MouseEvent) => {
         setVisible(old => {
            if (old) {
               let p = e.target as HTMLElement|null;
               while (p) {
                  if (p === widget.current) {
                     return old;  // no change, we want to select an item
                  }
                  p = p.parentElement;
               }
               e.stopPropagation();
               e.preventDefault();
            }
            return false;
         });
      },
      []
   );

   React.useEffect(
      () => {
         if (visible) {
            window.document.addEventListener('mousedown', onMouse);
            window.document.addEventListener('mouseup', onMouse);
            return () => {
               window.document.removeEventListener('mousedown', onMouse);
               window.document.removeEventListener('mouseup', onMouse);
            };
         }
      },
      [onMouse, visible]
   );

   return (
      <div
         className={`dropdown ${p.className ?? ''}`}
         ref={widget}
      >
         <div className="dropdownButton" onClick={onToggle}>
            {p.button}
         </div>
         <div
             className={`menu ${visible ? 'visible' : ''}`}
         >
            {visible && p.menu()}
         </div>
      </div>
   );
}
export default Dropdown;
