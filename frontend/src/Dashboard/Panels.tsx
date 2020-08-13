import * as React from 'react';
import { Select, Option } from 'Form';
import { SetHeaderProps } from 'Panel';

export type PanelTypes =
   'incomeexpenses' |
   'networth' |
   'quadrant' |
   'upcoming' |
   'p&l'      |
   'ledger'
   ;

/**
 * Properties for a dashboard panel, as saved in local storage
 */
export interface BaseProps {
   type: Readonly<PanelTypes>;
   rowspan: number;
   colspan: number;
}

/**
 * Properties for the settings editor of a dashboard panel
 */
export interface SettingsProps<T extends {}> {
   setData: (p: Partial<T>) => void;
}

export interface DashboardModule<T extends BaseProps> {
   Settings?: React.FC<T & SettingsProps<T>>;
   // A function that returns one or more <fieldset> to configure the module.
   // It receives the current properties of the module

   Content: React.FC<T & SetHeaderProps>;
}

export const BasePropEditor = (p: BaseProps & SettingsProps<BaseProps>) => {
   const changeRows = (a: string) => p.setData({rowspan: parseInt(a, 10)});
   const changeCols = (a: string) => p.setData({colspan: parseInt(a, 10)});

   return (
      <fieldset>
         <legend>Layout</legend>

         <Select
            text="Number of rows"
            value={p.rowspan}
            onChange={changeRows}
         >
            <Option text="one row"     value="1" />
            <Option text="two rows"    value="2" />
            <Option text="three rows"  value="3" />
            <Option text="four rows"   value="4" />
         </Select>

         <Select
            text="Number of columns"
            value={p.colspan}
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
