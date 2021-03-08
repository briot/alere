import * as React from 'react';
import * as ReactDOM from 'react-dom';
import classes from 'services/classes';
import { isFunc } from 'services/utils';
import './Tooltip.scss';

type TooltipFunc<T> = (d: T) => React.ReactNode;

const MARGIN = 10;
const DELAY_BEFORE = 200;
const DELAY_TO_CLOSE = 100;

export interface TooltipProps<T> {
   tooltip?: React.ReactNode | TooltipFunc<T> | undefined;
   tooltipData?: T|undefined;
}

/**
 * tooltip context
 */

interface TooltipContext<T> {
   show: (on: Element, d: TooltipProps<T>) => void,
   hide: () => void;
}
const noContext: TooltipContext<any> = {
   show: () => {},
   hide: () => {},
};

const ReactTooltipContext = React.createContext(noContext);

/**
 * Tooltip provider
 */

type Side = 'left' | 'bottom' | 'right' | 'top';
interface TooltipData {
   on?: Element;
   element?: React.ReactNode;
   visible: boolean;
}
const noTooltipData: TooltipData = {
   visible: false,
};

export const TooltipProvider: React.FC<{}> = p => {
   const [data, setData] = React.useState(noTooltipData);
   const tooltipRef = React.useRef<Element|null>();
   const side = React.useRef<Side>('bottom');
   const timeout = React.useRef(-1);

   const hide = React.useCallback(
      () => {
         timeout.current && window.clearTimeout(timeout.current);
         timeout.current = window.setTimeout(
            () => {
               timeout.current = -1;
               setData({visible: false});
            },
            DELAY_TO_CLOSE);
      },
      [],
   );

   const show = React.useCallback(
      (on: Element, d: TooltipProps<any>) => {
         let r: React.ReactNode | undefined;

         try {
            r = (d.tooltip === undefined)
               ? undefined
               : isFunc(d.tooltip)
               ? d.tooltip?.(d.tooltipData)
               : d.tooltip;
         } catch (e) {
            r = undefined;
         }

         if (r === undefined || r === null) {
            hide();
         } else {
            setData({element: r, on, visible: false, side: 'bottom'});
         }
      },
      [hide],
   );

   const ctx = React.useMemo(
      () => ({show, hide}),
      [show, hide],
   );

   let top = 0;
   let left = 0;
   if (data.on && tooltipRef.current) {
      const b = data.on.getBoundingClientRect();
      const ww = document.documentElement.clientWidth;
      const wh = document.documentElement.clientHeight;
      const w = tooltipRef.current.clientWidth;
      const h = tooltipRef.current.clientHeight;

      for (let attempt = 0; attempt < 4; attempt++) {
         if (side.current === 'bottom') {
            left = window.scrollX + Math.min(
               b.left + b.width / 2,
               ww - w/ 2);
            top = window.scrollY + b.bottom + MARGIN;
            if (top + h <= wh) {
               break;
            }
            side.current = 'right';
         }
         if (side.current === 'right') {
            left = window.scrollX + b.right + MARGIN;
            top = window.scrollY + Math.min(
               b.top + b.height / 2,
               wh - h / 2)
            if (left + w <= ww) {
               break;
            }
            side.current = 'top';
         }
         if (side.current === 'top') {
            left = window.scrollX + Math.min(
               b.left + b.width / 2,
               ww - w/ 2);
            top = window.scrollY + b.top - b.height - MARGIN;
            if (top + h <= wh) {
               break;
            }
            side.current = 'left';
         }
         if (side.current === 'left') {
            left = window.scrollX + b.left - w + MARGIN;
            top = window.scrollY + Math.min(
               b.top + b.height / 2,
               wh - h / 2,
            )
            if (left + w <= ww) {
               break;
            }
            side.current = 'bottom';
         }
      }

      if (!data.visible) {
         //  Let React update the DOM, to compute sizes, then move the element
         //  in place.
         timeout.current !== -1 && window.clearTimeout(timeout.current);
         timeout.current = window.setTimeout(
            () => {
               timeout.current = -1;
               if (tooltipRef.current) {
                  setData(d => ({...d, visible: true}));
               }
            },
            //  If we already have a tooltip open, reuse it immediately
            timeout.current === -1 ? DELAY_BEFORE : 0,
         );
      }
   }

   const c = classes(
      'tooltip',
      data.visible && data.on ? 'visible' : 'hidden',
      side.current,
   );

   return (
      <ReactTooltipContext.Provider value={ctx}>
         {p.children}
         {
            ReactDOM.createPortal(
               <div
                  className={c}
                  ref={e => tooltipRef.current = e}
                  style={{top, left}}
               >
                  {data.element}
               </div>,
               document.getElementById('app') ?? document.body,
            )
         }
      </ReactTooltipContext.Provider>
   );
}

const useTooltip = () => React.useContext(ReactTooltipContext);

/**
 * Tooltip
 */

interface TooltipPropsWithChild<T> extends TooltipProps<T> {
   children: React.ReactElement;
}

const Tooltip: React.FC<TooltipPropsWithChild<any>> = p => {
   const tooltip = useTooltip();

   const handleMouseEnter = React.useCallback(
      (n: React.MouseEvent) =>
         tooltip.show(
            n.target as Element,
            {
               tooltip: p.tooltip,
               tooltipData: p.tooltipData,
            }
         ),
      [p.tooltip, p.tooltipData, tooltip]
   );

   // Insert the child itself in the tree, not a wrapper. Otherwise, the
   // tooltip would not work on a table cell for instance, nor in recharts.
   // When there is no tooltip, do not bother with setting extra event handlers

   if (!p.tooltip) {
      return p.children;
   }
   return (
      React.cloneElement(
         React.Children.only(p.children), {
            onMouseEnter: handleMouseEnter,
            onMouseLeave: tooltip.hide,
         }
      )
   );
}

export default Tooltip;
