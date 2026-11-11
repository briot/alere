import * as React from 'react';
import { FixedSizeList } from 'react-window';
import { ListChildComponentProps } from 'react-window';
import { AlternateRows, TablePrefs } from '@/List/ListPrefs';
import classes from '@/services/classes';
import Table from '@/List';

const INDENT_LEVEL = 16;  // should match CSS --exp-padding-level

export interface RowDetails<T, SHARED> {
   isExpanded: boolean|undefined,  // undefined if not expandable
   logic: LogicalRow<T, SHARED>, // the matching logical row
}

/**
 * Description for each column in the array
 *    T is the type of data for one row
 *    SHARED is the configuration parameters for the table, along with
 *       any precomputed data used to show totals, footers,...
 */
export interface Column<T, SHARED=any> {
   id: string; // unique id for this column

   head?: string | ((settings: SHARED) => React.ReactNode);
   //  What to display in the column header. Defaults to `id`

   className?: string;
   title?: string;   // tooltip on header
   cell?: (data: T,
           details: RowDetails<T, SHARED>,
           settings: SHARED) => React.ReactNode;
   cellTitle?: (data: T) => React.ReactNode;  // tooltip on cell

   foot?: (settings: SHARED) => React.ReactNode;
   //  Compute what should be displayed in the footer.

   compare?: (left: T, right: T) => number;
   // Used for sorting. The column is not sortable if this is undefined

   rightBorder?: boolean;
   //  Whether we should show a border on the right of cells
}

/**
 * Description for one row in the array.
 * A row can be expanded (like a tree) to reveal children rows (which themselves
 * can have children rows).
 */
export interface LogicalRow<T, SHARED> {
   key: string|number;    //  unique id for this row (used a index in a Map)
   data: T;
   getChildren?:
      (d: T, settings: SHARED) => LogicalRow<T, SHARED>[];

   columnsOverride?: Column<T, SHARED>[];
   // In case a row should display a different set of columns, those columns
   // can be set here. They might not be properly aligned with the others,
   // though !
   // The header and footer are ignored for these columns.
}

/**
 * Whether a row should be expanded by default
 */
const computeDefaultExpand = <T extends unknown, SHARED> (
   r: LogicalRow<T, SHARED>,
   defaultExpand: undefined|boolean|((row: LogicalRow<T, SHARED>) => boolean),
) =>
   defaultExpand === undefined
      ? false
      : typeof(defaultExpand) === "boolean"
      ? defaultExpand
      : defaultExpand(r);

/**
 * An actual row in the table visible on the screen. Due to the way react-window
 * works we need to create different rows to avoid having to create all the DOM
 * nodes upfront
 */
interface PhysicalRow<T, SHARED> {
   logicalRow: LogicalRow<T, SHARED>; // points to the logical row
   topRowIndex: number; // index of the top parent row (for alternate colors)
   expandable: boolean;
   level: number;       // nesting level
}

const computePhysicalRows = <T extends unknown, SHARED> (
   r: LogicalRow<T, SHARED>,
   settings: SHARED,
   expanded: Map<number|string, boolean>,
   level: number,
   defaultExpand: undefined|boolean|((row: LogicalRow<T, SHARED>) => boolean),
   topRowIndex: number,
): PhysicalRow<T, SHARED>[] => {
   const children = r.getChildren?.(r.data, settings);
   const isExpanded =
      expanded.get(r.key) ?? computeDefaultExpand(r, defaultExpand);
   const result = [{
      logicalRow: r,
      topRowIndex,
      expandable: children ? children.length !== 0 : false,
      level: level,
   }];

   if (isExpanded) {
      return result.concat(
         children
            ? children.flatMap(c =>
               computePhysicalRows(
                  c, settings,
                   expanded, level + 1, defaultExpand, topRowIndex
               ))
            : []
      );
   } else {
      return result;
   }
}


interface PhysicalRows<T, SHARED> {
   rows: PhysicalRow<T, SHARED>[];
   expanded: Map<number|string, boolean>;
   expandableRows: boolean;  // at least one row is expandable
}


const usePhysicalRows = <T extends unknown, SHARED> (
   rows: LogicalRow<T, SHARED>[],
   settings: SHARED,
   defaultExpand: undefined|boolean|((row: LogicalRow<T, SHARED>) => boolean),
) => {
   //  Compute the initial set of rows
   const [phys, setPhys] = React.useState<
      PhysicalRows<T, SHARED>|undefined
   >();

   React.useEffect(
      () => {
         const expanded = new Map();
         const r = rows.flatMap((c, idx) =>
            computePhysicalRows(c, settings, expanded, 0, defaultExpand, idx));
         setPhys({
            rows: r,
            expanded,
            expandableRows: r.filter(r => r.expandable).length !== 0,
         });
      },
      [rows, defaultExpand, settings]
   );

   //  Whether the row is expanded
   //  This returns a tri-state result:
   //     - true to indicate the row is currently expanded
   //     - false to indicate it is not currently expanded, but could be
   //     - undefined to indicate it is not expandable
   const isExpanded = React.useCallback(
      (index: number) => {
         if (!phys) {
            return undefined;
         }
         const r = phys.rows[index].logicalRow;
         const e = phys.expanded.get(r.key);
         return phys.rows[index].expandable
            ? (e ?? computeDefaultExpand(r, defaultExpand))
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
            }

            const expanded = new Map(old.expanded);
            expanded.set(
               r.logicalRow.key,
               !(old.expanded.get(r.logicalRow.key)
                  ?? computeDefaultExpand(r.logicalRow, defaultExpand)));

            return {
               ...old,
               rows: rows.flatMap((c, idx) =>
                  computePhysicalRows(c, settings, expanded, 0, defaultExpand, idx)),
               expanded,
            };
         });
      },
      [defaultExpand, rows, settings]
   );

   return {phys: phys?.rows ?? [],
           isExpanded,
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

interface ListWithColumnsProps<T, SHARED> extends TablePrefs {
   columns: (undefined | Column<T, SHARED>) [];
   rows: LogicalRow<T, SHARED> [];
   className?: string;
   indentNested?: boolean;
   defaultExpand?: boolean | ((row: LogicalRow<T, SHARED>) => boolean);

   expanderColumn?: number;
   hideHeader?: boolean;
   hideFooter?: boolean;

   sortOn?: string;                  //  "+colid" or "-colid"
   setSortOn?: (on: string) => void; //  called when user wants to sort

   scrollToBottom?: boolean;
   //  If true, automatically show bottom row by default

   footColumnsOverride?: Column<T, SHARED>[];
   //  Columns to use for the footer, if the default columns are not
   //  appropriate

   settings: SHARED;
}

const ListWithColumns = <T extends unknown, SHARED=any> (
   p: ListWithColumnsProps<T, SHARED>,
) => {
   const list = React.createRef<FixedSizeList>();
   const oldRowCount = React.useRef(p.rows.length);
   const expandColumn: number = p.expanderColumn ?? 0;
   const cols = React.useMemo(
      () => p.columns.filter(
         c => c !== undefined) as Column<T, SHARED> [],
      [p.columns]
   );
   const sortedRows = React.useMemo(
      () => {
         if (p.sortOn === undefined) {
            return p.rows;
         }
         const colid = p.sortOn.slice(1);
         const col = cols.filter(c => c.id === colid)?.[0];
         if (!col || !col.compare) {
            return p.rows;
         }
         const asc = p.sortOn.charAt(0) === '+' ? 1 : -1;
         return [...p.rows].sort((a, b) => col.compare!(a.data, b.data) * asc);
      },
      [p.rows, p.sortOn, cols]
   );

   const {phys, expandableRows, isExpanded, toggleRow} =
      usePhysicalRows(sortedRows, p.settings, p.defaultExpand);
   const getKey = (idx: number) => phys[idx]!.logicalRow.key;

   // Scroll to bottom initially (when we had zero rows before and now have some)
   React.useEffect(
      () => {
         if (p.scrollToBottom && list.current && phys.length
             && oldRowCount.current === 0
         ) {
            list.current.scrollToItem(phys.length - 1, 'end');
            oldRowCount.current = phys.length;
         }
      },
      [phys.length, list, p.scrollToBottom]
   )

   const getRow = React.useCallback(
      (q: ListChildComponentProps) => {
         const logic = phys[q.index].logicalRow;
         const expanded = isExpanded(q.index);
         const onExpand = expanded === undefined
            ? undefined
            : (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
               // Do nothing when the user clicked on a form element, for
               // instance a checkbox in a tree list. Otherwise toggling the
               // checkbox would also toggle the row.
               // This cannot be resolved at the <Checkbox> level itself, since
               // we would need to intercept the click event (in addition to
               // listening to the change event), and that seems to break the
               // refresh of the <input>.

               if (e.target instanceof HTMLInputElement) {
                  return;
               }

               e.preventDefault();
               e.stopPropagation();
               toggleRow(q.index);
            };
         const theCols = logic.columnsOverride ?? cols;

         // Use width from CSS
         const style = {...q.style, width: undefined};

         return (
            <Table.TR
               style={style}
               expanded={expanded}
               onClick={onExpand}
               nestingLevel={phys[q.index].level}
               isOdd={
                  p.rowColors === AlternateRows.ROW
                  ? q.index % 2 === 0
                  : p.rowColors === AlternateRows.PARENT
                  ? phys[q.index].topRowIndex % 2 === 0
                  : undefined
               }
            >
            {
               theCols.map((c, idx) =>
                  <Table.TD
                     key={c.id}
                     className={classes(
                        c.className,
                        c.rightBorder && 'rightBorder',
                        idx === expandColumn && 'expander',
                     )}
                     tooltip={c.cellTitle}
                     tooltipData={logic.data}
                     style={{
                        // Indent first column to show nesting
                        paddingLeft:
                           idx !== expandColumn || !p.indentNested
                           ? undefined   // keep the CSS padding
                           : phys[q.index].level * INDENT_LEVEL
                     }}
                  >
                     {c.cell?.(
                        logic.data,
                        {
                           isExpanded: expanded,
                           logic,
                        },
                        p.settings,
                     )}
                  </Table.TD>
               )
            }
            </Table.TR>
         );
      },
      [phys, cols, isExpanded, toggleRow, p.indentNested,
       p.rowColors, p.settings, expandColumn]
   );

   const onSort = (col: Column<T, SHARED>) => {
      let sortOn: string;
      if (p.sortOn !== undefined
          && p.sortOn.slice(1) === col.id
      ) {
         const asc = p.sortOn.charAt(0);
         sortOn = `${asc === '+' ? '-' : '+'}${col.id}`;
      } else {
         sortOn = `+${col.id}`;
      }
      p.setSortOn?.(sortOn);
   }

   const header = !p.hideHeader && (
      <Table.TR>
      {
         cols.map((c, idx) =>
            <Table.TH
               key={idx}
               className={classes(
                  c.className,
                  c.rightBorder && 'rightBorder',
               )}
               tooltip={c.title}
               sortable={c.compare !== undefined && p.setSortOn !== undefined}
               asc={p.sortOn === undefined ||p.sortOn.slice(1) !== c.id
                  ? undefined
                  : p.sortOn.charAt(0) === '+'
               }
               onClick={
                  c.compare !== undefined
                  && p.setSortOn !== undefined
                  ? () => onSort(c)
                  : undefined
               }
            >
               {typeof c.head  === "function"
                  ? c.head(p.settings)
                  : c.head ?? c.id}
            </Table.TH>
         )
      }
      </Table.TR>
   );

   const footerColumns = p.footColumnsOverride ?? cols;
   const footer = !p.hideFooter && footerColumns.length
      ? (
         <Table.TR>
         {
            footerColumns.map((c, idx) =>
               <Table.TH key={idx} className={c.className} >
                  {c.foot?.(p.settings)}
               </Table.TH>
            )
         }
         </Table.TR>
      ) : null;

   return (
      <>
         <Table.Table
            className={p.className}
            itemCount={phys.length}
            itemKey={getKey}
            getRow={getRow}
            header={header}
            footer={footer}
            expandableRows={expandableRows}
            borders={p.borders}
            ref={list}
         />
      </>
   );
}

export default ListWithColumns;
