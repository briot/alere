import * as React from 'react';
import { SetHeaderProps } from 'Dashboard/Panel';

type PanelTypes =
   'incomeexpenses' |
   'networth'       |
   'quadrant'       |
   'upcoming'       |
   'pricehistory'   |
   'p&l'            |
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
   excludeFields?: string[]; // Do not allow configuring those fields
}

export interface DashboardModule<T extends BaseProps> {
   Settings?: React.FC<T & SettingsProps<T>>;
   // A function that returns one or more <fieldset> to configure the module.
   // It receives the current properties of the module

   Content: React.FC<T & SetHeaderProps>;
}
