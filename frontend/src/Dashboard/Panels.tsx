import * as React from 'react';
import { Select, Option } from 'Form';

export type PanelTypes =
   'incomeexpenses' |
   'networth' |
   'quadrant' |
   'upcoming' |
   'p&l'
   ;

export interface BaseProps {
   type: Readonly<PanelTypes>;
   rowspan: number;
   colspan: number;
}

export interface DashboardPanelProps<T extends BaseProps> {
   data: T;
   setData: (p: Partial<T | BaseProps>) => void;
}

export const BasePropEditor = <T extends BaseProps> (p: DashboardPanelProps<T>) => {
   const changeRows = (a: string) => p.setData({rowspan: parseInt(a, 10)});
   const changeCols = (a: string) => p.setData({colspan: parseInt(a, 10)});

   return (
      <fieldset>
         <legend>Layout</legend>

         <Select
            text="Number of rows"
            value={p.data.rowspan}
            onChange={changeRows}
         >
            <Option text="one row"     value="1" />
            <Option text="two rows"    value="2" />
            <Option text="three rows"  value="3" />
            <Option text="four rows"   value="4" />
         </Select>

         <Select
            text="Number of columns"
            value={p.data.colspan}
            onChange={changeCols}
         >
            <Option text="one column"     value="1" />
            <Option text="two columns"    value="2" />
            <Option text="three columns"  value="3" />
            <Option text="four columns"   value="4" />
         </Select>
      </fieldset>
   );
}
