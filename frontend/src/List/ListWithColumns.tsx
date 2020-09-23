import * as React from 'react';
import { ListChildComponentProps } from 'react-window';
import Table from 'List';

/**
 * Description for each column in the array
 */
export interface Column<T> {
   head: () => React.ReactNode;
   colspan?: number;
   className?: string;
   cell: (data: T) => React.ReactNode;
   foot?: () => React.ReactNode;
}

/**
 * Description for one row in the array.
 * A row can be expanded (like a tree) to reveal children rows (which themselves
 * can have children rows).
 */
export interface LogicalRow<T> {
   key: string|number;    //  unique id for this row
   data: T;
   getChildren?: () => LogicalRow<T>[];
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
): PhysicalRow<T>[] => {
   const children = r.getChildren?.();
   const isExpanded = expanded.get(r.key);
   const result = [{
      logicalRow: r,
      numChildren: isExpanded ? children!.length : 0,
      expandable: children ? children.length !== 0 : false,
      level: level,
   }];

   if (isExpanded) {
      return result.concat(
         children
            ? children.flatMap(c => computePhysicalRows(c, expanded, level + 1))
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


const usePhysicalRows = <T extends any> (rows: LogicalRow<T>[]) => {
   //  Compute the initial set of rows
   const [phys, setPhys] = React.useState<PhysicalRows<T>|undefined>();

   React.useEffect(
      () => {
         const expanded = new Map();
         const r = rows.flatMap(c => computePhysicalRows(c, expanded, 0));
         setPhys({
            rows: r,
            expanded,
            expandableRows: r.filter(r => r.expandable).length !== 0,
         });
      },
      [rows]
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
            ? (e ?? false)
            : undefined;
      },
      [phys]
   );

   //  Expand or collapse the physical row at the given index
   const toggleRow = React.useCallback(
      (index: number) => {
         setPhys(old => {
            const r = old?.rows[index];
            if (!r || !old) {
               return old;
            } else if (old.expanded.get(r.logicalRow.key)) {
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
                        r.logicalRow, expanded, r.level),
                     ...old.rows.slice(index + 1),
                  ],
                  expanded,
               };
            }
         });
      },
      []
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
}

const ListWithColumns = <T extends any> (p: ListWithColumnsProps<T>) => {
   const cols = React.useMemo(
      () => p.columns.filter(c => c !== undefined) as Column<T> [],
      [p.columns]
   );
   const {phys, expandableRows, isExpandable, toggleRow} = usePhysicalRows(p.rows);
   const getKey = (idx: number) => phys[idx]!.logicalRow.key;

   const getRow = React.useCallback(
      (q: ListChildComponentProps) => {
         const expandable = isExpandable(q.index);
         const onExpand = expandable === undefined
            ? undefined
            : () => toggleRow(q.index);
         return (
            <Table.TR
               style={q.style}
               expanded={isExpandable(q.index)}
               onClick={onExpand}
            >
            {
               cols.map((c, idx) =>
                  <Table.TD
                     key={idx}
                     className={c.className}
                     style={{
                        // Indent first column to show nesting
                        paddingLeft: idx !== 0
                           ? 0
                           : phys[q.index].level * 20
                     }}
                  >
                     {c.cell(phys[q.index].logicalRow.data)}
                  </Table.TD>
               )
            }
            </Table.TR>
         );
      },
      [phys, cols, isExpandable, toggleRow]
   );

   const header = (
      <Table.TR>
      {
         cols.map((c, idx) =>
            <Table.TH key={idx} className={c.className} >
               {c.head()}
            </Table.TH>
         )
      }
      </Table.TR>
   );

   const footer = (
      <Table.TR>
      {
         cols.map((c, idx) =>
            <Table.TH key={idx} className={c.className} >
               {c.foot?.()}
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
      />
   );
}

export default ListWithColumns;
