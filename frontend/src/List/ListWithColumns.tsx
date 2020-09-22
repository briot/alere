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
 * A table that provides the following capabilities:
 *  - very efficient even with thousands of row
 *  - columns are defined via explicit objects, making the header, footer and
 *    content of the table automatically filled, and helping save columns
 *    configuration
 */

interface ListWithColumnsProps<T> {
   columns: (undefined | Column<T>) [];
   data: T[];
   getKey?: (data: T, idx: number) => string|number;
   className?: string;
}

const ListWithColumns = <T extends any> (p: ListWithColumnsProps<T>) => {
   const cols = React.useMemo(
      () => p.columns.filter(c => c !== undefined) as Column<T> [],
      [p.columns]
   );

   const getKey = (idx: number) => p.getKey?.(p.data[idx], idx) ?? idx;

   const getRow = React.useCallback(
      (q: ListChildComponentProps) =>
         <Table.TR style={q.style} >
         {
            cols.map((c, idx) =>
               <Table.TD key={idx} className={c.className} >
                  {c.cell(p.data[q.index])}
               </Table.TD>
            )
         }
         </Table.TR>,
      [p.data, cols]
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
         itemCount={p.data.length}
         itemKey={getKey}
         getRow={getRow}
         header={header}
         footer={footer}
      />
   );
}

export default ListWithColumns;
