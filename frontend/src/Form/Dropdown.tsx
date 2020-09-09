import * as React from 'react';
import './Dropdown.scss';

interface DropdownProps {
   // button: (onClick: () => void) => React.ReactNode;
   // menu: () => React.ReactNode;
   button: React.ReactNode;
   menu: () => React.ReactNode;
   className?: string;

   // If true, the dropdown is closed when clicking inside it. Otherwise we
   // keep it open.
   closeOnInsideClick?: boolean;
}

const Dropdown: React.FC<DropdownProps> = p => {
   const [visible, setVisible] = React.useState(false);
   const widget = React.useRef<HTMLDivElement>(null);

   const onToggle = () => setVisible(old => !old);
   const onClose  = () => setVisible(false);

   const onMouse = React.useCallback(
      (e : MouseEvent) => {
         setVisible(old => {
            if (old) {
               let t = e.target as HTMLElement|null;
               while (t) {
                  if (t === widget.current) {
                     return old;  // no change, we want to select an item
                  }
                  t = t.parentElement;
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
            window.document.addEventListener('mouseup', onMouse, true);
            return () => {
               window.document.removeEventListener('mouseup', onMouse, true);
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
             onClick={p.closeOnInsideClick ? onClose : undefined}
         >
            {visible && p.menu()}
         </div>
      </div>
   );
}
export default Dropdown;
