import * as React from 'react';
import { ListChildComponentProps } from 'react-window';
import Table from 'List';

/**
 * Description for each column in the array
 */
export interface Column<T> {
   head?: string | (() => React.ReactNode);
   className?: string;
   sortable?: boolean;
   title?: string;
   cell?: (data: T) => React.ReactNode;
   foot?: string | ((data: LogicalRow<T>[]) => React.ReactNode);
}

/**
 * Description for one row in the array.
 * A row can be expanded (like a tree) to reveal children rows (which themselves
 * can have children rows).
 */
export interface LogicalRow<T> {
   key: any;    //  unique id for this row (used a index in a Map)
   data: T;
   getChildren?: (d: T) => LogicalRow<T>[];

   columnsOverride?: Column<T>[];
   // In case a row should display a different set of columns, those columns
   // can be set here. They might not be properly aligned with the others,
   // though !
   // The header and footer are ignored for these columns.
}

/**
 * An actual row in the table visible on the screen. Due to the way react-window
 * works we need to create different rows to avoid having to create all the DOM
 * nodes upfront
 */
interface PhysicalRow<T> {
   logicalRow: LogicalRow<T>; // points to the logical row
   numChildren: number;       // number of visible children rows on the screen
   expandable: boolean;
   level: number;             // nesting level
}

const computePhysicalRows = <T extends any> (
   r: LogicalRow<T>,
   expanded: Map<number|string, boolean>,
   level: number,
   defaultExpand: boolean,
): PhysicalRow<T>[] => {
   const children = r.getChildren?.(r.data);
   const isExpanded = expanded.get(r.key) ?? defaultExpand;
   const result = [{
      logicalRow: r,
      numChildren: isExpanded && children ? children.length : 0,
      expandable: children ? children.length !== 0 : false,
      level: level,
   }];

   if (isExpanded) {
      return result.concat(
         children
            ? children.flatMap(c =>
               computePhysicalRows(c, expanded, level + 1, defaultExpand))
            : []
      );
   } else {
      return result;
   }
}


interface PhysicalRows<T> {
   rows: PhysicalRow<T>[];
   expanded: Map<number|string, boolean>;
   expandableRows: boolean;  // at least one row is expandable
}


const usePhysicalRows = <T extends any> (
   rows: LogicalRow<T>[],
   defaultExpand: boolean,
) => {
   //  Compute the initial set of rows
   const [phys, setPhys] = React.useState<PhysicalRows<T>|undefined>();

   React.useEffect(
      () => {
         const expanded = new Map();
         const r = rows.flatMap(c =>
            computePhysicalRows(c, expanded, 0, defaultExpand));
         setPhys({
            rows: r,
            expanded,
            expandableRows: r.filter(r => r.expandable).length !== 0,
         });
      },
      [rows, defaultExpand]
   );

   //  Whether the row is expanded
   //  This returns a tri-state result:
   //     - true to indicate the row is currently expanded
   //     - false to indicate it is not currently expanded, but could be
   //     - undefined to indicate it is not expandable
   const isExpandable = React.useCallback(
      (index: number) => {
         if (!phys) {
            return undefined;
         }
         const e = phys.expanded.get(phys.rows[index].logicalRow.key);
         return phys.rows[index].expandable
            ? (e ?? defaultExpand)
            : undefined;
      },
      [phys, defaultExpand]
   );

   //  Expand or collapse the physical row at the given index
   const toggleRow = React.useCallback(
      (index: number) => {
         setPhys(old => {
            const r = old?.rows[index];
            if (!r || !old) {
               return old;
            } else if (old.expanded.get(r.logicalRow.key) ?? defaultExpand) {
               const expanded = new Map(old.expanded);
               expanded.set(r.logicalRow.key, false);
               return {
                  ...old,
                  rows: [
                     ...old.rows.slice(0, index + 1),
                     ...old.rows.slice(index + 1 + r.numChildren),
                  ],
                  expanded,
               };
            } else {
               const expanded = new Map(old.expanded);
               expanded.set(r.logicalRow.key, true);
               return {
                  ...old,
                  rows: [
                     ...old.rows.slice(0, index),
                     ...computePhysicalRows(
                        r.logicalRow, expanded, r.level, defaultExpand),
                     ...old.rows.slice(index + 1),
                  ],
                  expanded,
               };
            }
         });
      },
      [defaultExpand]
   );

   return {phys: phys?.rows ?? [],
           isExpandable,
           expandableRows: phys?.expandableRows,
           toggleRow};
}

/**
 * A table that provides the following capabilities:
 *  - very efficient even with thousands of row
 *  - columns are defined via explicit objects, making the header, footer and
 *    content of the table automatically filled, and helping save columns
 *    configuration
 *  - nesting of rows (to show a tree)
 */

interface ListWithColumnsProps<T> {
   columns: (undefined | Column<T>) [];
   rows: LogicalRow<T> [];
   className?: string;
   indentNested?: boolean;
   borders?: boolean;
   defaultExpand?: boolean;

   footColumnsOverride?: Column<T>[];
   //  Columns to use for the footer, if the default columns are not
   //  appropriate
}

const ListWithColumns = <T extends any> (p: ListWithColumnsProps<T>) => {
   const cols = React.useMemo(
      () => p.columns.filter(c => c !== undefined) as Column<T> [],
      [p.columns]
   );
   const {phys, expandableRows, isExpandable, toggleRow} =
      usePhysicalRows(p.rows, p.defaultExpand ?? false);
   const getKey = (idx: number) => phys[idx]!.logicalRow.key;

   const getRow = React.useCallback(
      (q: ListChildComponentProps) => {
         const logic = phys[q.index].logicalRow;
         const expandable = isExpandable(q.index);
         const onExpand = expandable === undefined
            ? undefined
            : () => toggleRow(q.index);
         const theCols = logic.columnsOverride ?? cols;

         // Use width from CSS
         const style = {...q.style, width: undefined};

         return (
            <Table.TR
               style={style}
               expanded={isExpandable(q.index)}
               onClick={onExpand}
               nestingLevel={phys[q.index].level}
            >
            {
               theCols.map((c, idx) =>
                  <Table.TD
                     key={idx}
                     className={c.className}
                     style={{
                        // Indent first column to show nesting
                        paddingLeft:
                           idx !== 0 || !p.indentNested
                           ? undefined   // keep the CSS padding
                           : phys[q.index].level * 20
                     }}
                  >
                     {c.cell?.(logic.data)}
                  </Table.TD>
               )
            }
            </Table.TR>
         );
      },
      [phys, cols, isExpandable, toggleRow, p.indentNested]
   );

   const header = (
      <Table.TR>
      {
         cols.map((c, idx) =>
            <Table.TH
               key={idx}
               className={c.className}
               title={c.title}
               sortable={c.sortable}
            >
               {typeof c.head  === "function" ? c.head() : c.head}
            </Table.TH>
         )
      }
      </Table.TR>
   );

   const footer = (
      <Table.TR>
      {
         (p.footColumnsOverride ?? cols).map((c, idx) =>
            <Table.TH key={idx} className={c.className} >
               {typeof c.foot === "function" ? c.foot(p.rows) : c.foot}
            </Table.TH>
         )
      }
      </Table.TR>
   );

   return (
      <Table.Table
         className={p.className}
         itemCount={phys.length}
         itemKey={getKey}
         getRow={getRow}
         header={header}
         footer={footer}
         expandableRows={expandableRows}
         borders={p.borders}
      />
   );
}

export default ListWithColumns;
