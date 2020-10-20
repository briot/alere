import * as React from 'react';
import { SetHeader } from 'Header';

type PanelTypes =
   'incomeexpenses' |
   'networth'       |
   'quadrant'       |
   'upcoming'       |
   'pricehistory'   |
   'metrics'        |
   'ledger'         |
   'mean'           |
   'investments'
   ;

/**
 * Properties for a dashboard panel, as saved in local storage
 */
export interface BaseProps {
   type: Readonly<PanelTypes>;
   rowspan: number;
   colspan: number;
}

export interface SaveData<T extends {}> {
   setData: (p: Partial<T>) => void;
}

/**
 * Properties for the settings editor of a dashboard panel
 */
export interface SettingsProps<T extends {}> extends SaveData<T>{
   excludeFields?: string[]; // Do not allow configuring those fields
}

export interface DashboardModule<T extends BaseProps> {
   Settings?: React.FC<T & SettingsProps<T>>;
   // A function that returns one or more <fieldset> to configure the module.
   // It receives the current properties of the module

   Content: React.FC<T & SetHeader & SaveData<T>>;
   // What to show in the panel
}
