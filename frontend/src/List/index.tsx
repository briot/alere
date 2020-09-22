import * as React from 'react';
import { VariableSizeList, FixedSizeList,
         ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import classes from 'services/classes';
import './List.scss';

const ROW_HEIGHT = 25;  // pixels

/**
 * A header cell
 */

interface THProps {
   sortable?: boolean;
   asc?: boolean; // if sorted (not undefined), whether ascending or descending
   kind?: string;
   className?: string;
   title?: string;
   style?: React.CSSProperties;
}
const TH: React.FC<THProps> = p => {
   const n = classes(
      'th',
      p.className,
      p.kind,
      p.sortable && 'sortable',
      p.asc === undefined ? '' : p.asc ? 'sort-up' : 'sort-down',
   );
   return (
       <span
          className={n}
          style={p.style}
          title={p.title}
       >
          {p.children}
       </span>
   );
}

/**
 * A standard cell
 */

interface TDProps {
   kind?: string;
   className?: string;
   title?: string;
}
const TD: React.FC<TDProps> = p => {
   const n = classes(
      'td',
      p.kind,
      p.className,
   );
   return (
      <span className={n} title={p.title}>
         {p.children}
      </span>
   );
}

/**
 * A row in the table
 */

interface TRProps {
   partial?: boolean;  // if yes, cells will be aligned to the right
   editable?: boolean;
   secondary?: boolean;  // in gray
   style?: React.CSSProperties;
   className?: string;
}
const TR: React.FC<TRProps> = p => {
   const n = classes(
      'tr',
      p.className,
      p.partial && 'right-aligned',
      p.editable && 'edit',
      p.secondary && 'secondary',
   );
   return (
      <div className={n} style={p.style} >
         {p.children}
      </div>
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
   background?: boolean;
   expandableRows?: boolean;
   header?: React.ReactNode;
   footer?: React.ReactNode;
   className?: string;
}
const Table: React.FC<TableProps & React.RefAttributes<VariableSizeList>>
   = React.forwardRef(
(p, ref) => {
   const c = classes(
      'table',
      p.className,
      p.expandableRows && 'expandableRows',
      p.borders && 'borders',
      p.background && 'background',
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
                           ref={ref}
                           itemCount={p.itemCount}
                           itemSize={p.itemSize as (index:number)=>number}
                           itemKey={p.itemKey}
                        >
                           {p.getRow}
                        </VariableSizeList>
                     ) : (
                        <FixedSizeList
                           width={width}
                           height={height}
                           itemCount={p.itemCount}
                           itemSize={(p.itemSize ?? ROW_HEIGHT)  as number}
                           itemKey={p.itemKey}
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

export default { TR, TD, TH, Table, ROW_HEIGHT };
