/**
 * Properties for a dashboard panel, as saved in local storage.
 * This will be extended for each of our panel, in the View.tsx file.
 */
export interface PanelBaseProps {
   type: Readonly<string>;
   rowspan: number;
   colspan: number;
   hidePanelHeader?: boolean;
}

/**
 * Properties for a panel component: the same as above, but also support for
 * changing and saving properties interactively.
 */
export interface PanelProps <T extends PanelBaseProps> {
   props: T;

   excludeFields?: string[];
   // List of fields with a forced value, that cannot be edited interactively

   save: (p: Partial<T>) => void;
   // Saving the properties of the panel in local storage.
}
