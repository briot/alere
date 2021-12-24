import * as React from 'react';
import * as ReactDOM from 'react-dom';
import classes from '@/services/classes';
import { clamp, isFunc } from '@/services/utils';
import './Tooltip.scss';

export type TooltipFunc<T> = (d: T) => React.ReactNode;

const MARGIN = 4;
const DELAY_BEFORE = 600;
const DELAY_TO_CLOSE = 100;

export interface TooltipProps<T> {
   tooltip?: React.ReactNode | TooltipFunc<T> | undefined;
   tooltipData?: T|undefined;
}

/**
 * tooltip context
 */

interface TooltipContext<T> {
   show: (on: Element|null, d: TooltipProps<T>) => void,
   hide: () => void;
}
const noContext: TooltipContext<any> = {
   show: () => {},
   hide: () => {},
};

const ReactTooltipContext = React.createContext(noContext);

/**
 * Compute position of the tooltip window
 */

type Side = 'left' | 'bottom' | 'right' | 'top';
interface Position {
   side: Side;
   top?: number | undefined;
   bottom?: number | undefined;
   left?: number | undefined;
   right?: number | undefined;
}

const computePos = (
   anchor: Element|undefined,
   tooltipWidth: number,
   tooltipHeight: number,
   defaultSide: Side,
): Position => {
   if (!anchor) {
      return { side: defaultSide };
   }

   const b  = anchor.getBoundingClientRect();

   const tbw = tooltipWidth;
   const tbh = tooltipHeight;

   const ww = document.documentElement.clientWidth;
   const wh = document.documentElement.clientHeight;
   let side = defaultSide;
   let r: Position = {side};
   const isValid = (r: Position) =>
      (r.top === undefined ? true : 0 <= r.top && r.top + tbh <= wh)
      && (r.left === undefined ? true : 0 <= r.left && r.left + tbw <= ww)
      && (r.right === undefined ? true
          : 0 <= b.x - r.right - tbw && b.x - r.right <= ww);

   for (let attempt = 0; attempt < 4; attempt++) {
      switch (side) {
         case 'bottom':
            r = {
               side,
               left: window.scrollX + clamp(
                  b.left + b.width / 2 - tbw / 2,
                  0, ww - tbw),
               top: window.scrollY + b.bottom + MARGIN,
            };
            side = 'right';
            break;

         case 'right':
            r = {
               side,
               left: window.scrollX + b.right + MARGIN,
               top: window.scrollY + clamp(
                  b.top + b.height / 2 - tbh / 2,
                  0, wh - tbh),
            };
            side = 'top';
            break;

         case 'top':
            r = {
               side,
               left: window.scrollX + clamp(
                  b.left + b.width / 2 - tbw / 2,
                  0, ww - tbw),
               top: window.scrollY + b.top - tbh - MARGIN,
            };
            side = 'left';
            break;

         case 'left':
            r = {
               side,
               right: ww - b.left + MARGIN,
               top: window.scrollY + clamp(
                  b.top + b.height / 2 - tbh / 2,
                  0, wh - tbh),
            };
            side = 'bottom';
            break;
      }

      if (isValid(r)) {
         return r;
      }
   }
   return r;  //  return the last candidate anyway
}

/**
 * Tooltip provider
 */

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
   const timeout = React.useRef(-1);
   const [pos, setPos] = React.useState<Position>({ side: 'bottom' });
   const obs = React.useRef<ResizeObserver|undefined>();

   /**
    * Called every time the <tooltip> element is mounted, or this callback
    * changes (so when data.on changes)
    */
   const setRef = React.useCallback(
      (e: Element|null) => {
         tooltipRef.current = e;

         if (obs.current) {
            obs.current.disconnect();
         }

         if (e) {
            obs.current = new ResizeObserver(
               (entries) => {
                  for (let entry of entries) {
                     setPos(d => {
                        // ??? 15 and 20 are empirical numbers. Would be better
                        // to use entry.borderBoxSize, but this is an object
                        // in firefox, and typescript (and standard) expect an
                        // array.
                        return computePos(
                           data.on            /* anchor */,
                           entry.contentRect.width + 15,
                           entry.contentRect.height + 20,
                           d.side             /* defaultSide */,
                        );
                     });
                  }
               }
            );
            obs.current?.observe(e);
         }
      },
      [data.on]
   );

   const hide = React.useCallback(
      () => setData(d => ({ ...d, on: undefined, visible: false })),
      [],
   );

   const show = React.useCallback(
      (on: Element|null, d: TooltipProps<any>) => {
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

         if (on === null || r === undefined || r === null) {
            setData(d => ({ ...d, visible: false, on: undefined }));  // hide
         } else {
            setData({element: r, on, visible: false});
         }
      },
      [],
   );

   const ctx = React.useMemo(
      () => ({show, hide}),
      [show, hide],
   );

   if (data.on && tooltipRef.current) {
      if (!data.visible) {
         timeout.current !== -1 && window.clearTimeout(timeout.current);
         timeout.current = window.setTimeout(
            () => {
               timeout.current = -1;
               setData(d => ({ ...d, visible: true }));
            },
            DELAY_BEFORE,
         );
      }
   } else {
      if (data.visible) {
         timeout.current !== -1 && window.clearTimeout(timeout.current);
         timeout.current = window.setTimeout(
            () => {
               timeout.current = -1;
               setData({ visible: false });
            },
            DELAY_TO_CLOSE
         );
      }
   }

   const c = classes(
      'tooltip-base',
      'tooltip',
      data.visible && data.on && tooltipRef.current ? 'visible' : 'hidden',
      pos.side,
   );

   return (
      <ReactTooltipContext.Provider value={ctx}>
         {p.children}
         {
            ReactDOM.createPortal(
               <div
                  className={c}
                  ref={setRef}
                  style={{
                     top: pos.top,
                     left: pos.left,
                     right: pos.right,
                     bottom: pos.bottom,
                  }}
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
   const ref = React.useRef<Element>(null);
   const tooltip = useTooltip();

   const handleMouseEnter = React.useCallback(
      () => tooltip.show(
         ref.current,
         {
            tooltip: p.tooltip,
            tooltipData: p.tooltipData,
         }
      ),
      [p.tooltip, p.tooltipData, tooltip]
   );

   React.useEffect(
      () => { return () => tooltip.hide() },
      [tooltip]
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
            ref,
         }
      )
   );
}

export default Tooltip;
