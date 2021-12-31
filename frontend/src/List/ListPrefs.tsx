/**
 * Some common user-facing properties shared by table-based widgets
 */

import * as React from 'react';
import { Checkbox, Select } from '@/Form';

export enum AlternateRows {
   NO_COLOR,   // do not alternate background colors
   ROW,        // each row (and child rows) alternates colors
   PARENT,     // color of a row depends on the top-level parent
}

export interface TablePrefs {
   borders?: boolean;
   rowColors?: AlternateRows;
}

export const TableSettings: React.FC<
   TablePrefs & { save: (p: TablePrefs) => void; }
> = p => {
   const changeBorders = (borders: boolean) =>
      p.save({ rowColors: p.rowColors, borders });
   const changeColor = (rowColors: AlternateRows) =>
      p.save({ borders: p.borders, rowColors });
   return (
      <fieldset>
         <legend>Table Layout</legend>
         <Checkbox
             value={p.borders}
             onChange={changeBorders}
             text="Show borders"
         />
         <Select
             text="Colors"
             onChange={changeColor}
             value={p.rowColors}
             options={[
                {text: "No Color",       value: AlternateRows.NO_COLOR},
                {text: "Alternate rows", value: AlternateRows.ROW},
                {text: "Toplevel rows",  value: AlternateRows.PARENT},
            ]}
         />
      </fieldset>
   );
}

