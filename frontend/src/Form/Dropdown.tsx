import * as React from 'react';
import './Dropdown.scss';

interface DropdownProps {
   button: (visible: boolean) => React.ReactNode;
   menu: React.ReactNode;
   className?: string;

   // If true, the dropdown is closed when clicking inside it. Otherwise we
   // keep it open.
   closeOnInsideClick?: boolean;
}

interface Pos {
   horiz?: 'left' | 'right'; // undefined when not computed yet
   vert?: number | 'above' | 'below';
}

const Dropdown: React.FC<DropdownProps> = p => {
   const [visible, setVisible] = React.useState(false);
   const [pos, setPos] = React.useState<Pos>({});
   const widget = React.useRef<HTMLDivElement>(null);

   const computePos = () => {
      const menu = widget.current?.querySelector('.menu');
      const w = menu?.clientWidth;

      if (!w || !widget.current) { // we could not compute the size yet
         window.setTimeout(computePos, 50);
         return;
      }

      const bb = widget.current.getBoundingClientRect();
      const h = menu!.clientHeight;
      const dh = document.documentElement.clientHeight;
      setPos({
         horiz: bb.left + w > document.documentElement.clientWidth
            ? 'left' : 'right',
         vert: bb.top + h <= dh
            ? 'below'
            : bb.top - h < 0 ? -bb.top
            : 'above',
      });
   }

   const doVisible = (visible: boolean) => {
      setVisible(visible);
      setPos({});

      if (visible) {
         computePos();
      }
   }

   // const onToggle = () => setPos(old => ({ visible: !old.visible }));
   // const onClose  = () => setPos({ visible: false });

   const onToggle = () => doVisible(!visible);
   const onClose  = () => doVisible(false);

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

   const c = `dropdown ${p.className ?? ''} ${pos.horiz ?? 'offscreen'}` +
      ` ${visible ? 'visible' : ''}`;

   return (
      <div
         className={c}
         ref={widget}
      >
         <div className="dropdownButton" onClick={onToggle}>
            {p.button(visible)}
         </div>
         <div
             className="menu"
             style={{top: pos.vert === 'above' ? 'auto'
                          : pos.vert === 'below' ? '100%'
                          : pos.vert,
                     bottom: pos.vert === 'above' ? '100%' : 'auto',
                   }}
             onClick={p.closeOnInsideClick ? onClose : undefined}
         >
            {
               // Always populate the menu, so that we can compute its size
               // when the menu is open to decide which side to display on.
               // Otherwise there is a flash of the dialog before it is moved
               // to the left side.
               p.menu
            }
         </div>
      </div>
   );
}
export default Dropdown;
