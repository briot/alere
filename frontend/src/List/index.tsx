import * as React from 'react';
import { VariableSizeList, FixedSizeList,
         ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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
}
const TH: React.FC<THProps> = p => {
   const sortClass = p.sortable ? 'sortable' : '';
   const ascClass = p.asc === undefined ? '' : p.asc ? 'sort-up' : 'sort-down';
   return (
       <span
          className={`th ${p.kind || ''} ${sortClass} ${ascClass} ${p.className || ''}`}
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
}
const TD: React.FC<TDProps> = p => {
   const className = `td ${p.kind || ''} ${p.className || ''}`;
   return (
      <span className={className}>
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
}
const TR: React.FC<TRProps> = p => {
   const editClass = p.editable ? 'edit' : '';
   const className = `tr ${p.partial ? 'right-aligned' : ''} ${editClass}`;
   return (
      <div className={className} >
         {p.children}
      </div>
   );
}

/**
 * A table
 */

interface TableProps {
   itemCount: number;
   itemSize: number | ((index: number) => number);
   itemKey: (index: number) => number|string;
   getRow: React.ComponentType<ListChildComponentProps>;

   borders?: boolean;
   background?: boolean;
   expandableRows?: boolean;
   header?: React.ReactNode|React.ReactNode;
   footer?: React.ReactNode|React.ReactNode;
}
const Table: React.FC<TableProps & React.RefAttributes<VariableSizeList>>
   = React.forwardRef(
(p, ref) => {
   const c = `table `
      + (p.expandableRows ? ' expandableRows' : '')
      + (p.borders ? ' borders' : '')
      + (p.background ? ' background' : '');
   const isVariable = isNaN(p.itemSize as any);
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
                           itemSize={p.itemSize as number}
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
