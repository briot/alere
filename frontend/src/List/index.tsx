import * as React from 'react';
import { VariableSizeList, FixedSizeList,
         ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import classes from '@/services/classes';
import Tooltip, { TooltipProps } from '@/Tooltip';
import './List.scss';

const ROW_HEIGHT = 25;  // pixels

/**
 * A header cell
 */

interface THProps<TOOLTIP_DATA> extends TooltipProps<TOOLTIP_DATA> {
   sortable?: boolean;
   asc?: boolean; // if sorted (not undefined), whether ascending or descending
   className?: string;
   style?: React.CSSProperties;
   onClick?: () => void;
}
const TH: React.FC<THProps<any>> = p => {
   const n = classes(
      'th',
      p.className,
      p.sortable && 'sortable',
      p.asc === undefined ? '' : p.asc ? 'sorted-up' : 'sorted-down',
   );
   return (
      <Tooltip tooltip={p.tooltip} tooltipData={p.tooltipData}>
         <span
            className={n}
            style={p.style}
            onClick={p.onClick}
         >
            {p.children}
         </span>
      </Tooltip>
   );
}

/**
 * A standard cell
 */

interface TDProps<TOOLTIP_DATA> extends TooltipProps<TOOLTIP_DATA> {
   className?: string;
   style?: React.CSSProperties;
}
const TD: React.FC<TDProps<any>> = p => {
   const n = classes(
      'td',
      p.className,
   );
   return (
      <Tooltip tooltip={p.tooltip} tooltipData={p.tooltipData}>
         <span className={n} style={p.style}>
            {p.children}
         </span>
      </Tooltip>
   );
}

/**
 * A row in the table
 */

interface TRProps<TOOLTIP_DATA> extends TooltipProps<TOOLTIP_DATA> {
   editable?: boolean;
   nestingLevel?: number;
   style?: React.CSSProperties;
   className?: string;
   isOdd?: boolean;  // to alternate row colors

   onClick?: () => void;

   expanded?: undefined|true|false;
   // undefined if not expandable. This only has an effect if the Table itself
   // had an expandableRows property set to True.
}
const TR: React.FC<TRProps<any>> = p => {
   const n = classes(
      'tr',
      p.className,
      p.isOdd && 'odd',
      p.editable && 'edit',
      `nesting-${p.nestingLevel ?? 0}`,
      p.expanded !== undefined
         && (p.expanded ? 'expandable expanded' : 'expandable collapsed'),
   );
   return (
      <Tooltip tooltip={p.tooltip} tooltipData={p.tooltipData}>
         <div className={n} style={p.style} onClick={p.onClick}>
            {p.children}
         </div>
      </Tooltip>
   );
}

/**
 * Low-level support for creating tables.
 * It provides a few React components that helps create rows, cells,...
 * We do not use an actual <table> for compatibility with react-window, and
 * because it might make configuring column widths easier.
 */

interface TableProps {
   itemCount: number;
   itemSize?: number | ((index: number) => number);
   itemKey: (index: number) => number|string;
   getRow: React.ComponentType<ListChildComponentProps>;

   borders?: boolean;
   expandableRows?: boolean;
   header?: React.ReactNode;
   footer?: React.ReactNode;
   className?: string;
}
const Table: React.FC<
   TableProps & React.RefAttributes<FixedSizeList>
> = React.forwardRef((p, ref) => {
   const c = classes(
      'table',
      p.className,
      p.expandableRows && 'expandableRows',
      p.borders && 'borders',
   );
   const isVariable = p.itemSize !== undefined && isNaN(p.itemSize as any);
   return (
      <div className={c}>
         {
            p.header &&
            <div className="thead">
               {p.header}
            </div>
         }

         <div className="tbody">
            <AutoSizer>
               {
                  ({width, height}) => (
                     isVariable ? (
                        <VariableSizeList
                           width={width}
                           height={height}
                           itemCount={p.itemCount}
                           itemSize={p.itemSize as (index:number)=>number}
                           itemKey={p.itemKey}
                           overscanCount={10}
                        >
                           {p.getRow}
                        </VariableSizeList>
                     ) : (
                        <FixedSizeList
                           width={width}
                           height={height}
                           ref={ref}
                           itemCount={p.itemCount}
                           itemSize={(p.itemSize ?? ROW_HEIGHT)  as number}
                           itemKey={p.itemKey}
                           overscanCount={10}
                        >
                           {p.getRow}
                        </FixedSizeList>
                     )
                  )
               }
             </AutoSizer>
         </div>
         {
            p.footer &&
            <div className="tfoot">
               {p.footer}
            </div>
         }
      </div>
   );
});

const List = { TR, TD, TH, Table, ROW_HEIGHT };
export default List;
