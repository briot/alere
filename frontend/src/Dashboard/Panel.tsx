import * as React from 'react';
import { Select } from 'Form';
import RoundButton from 'RoundButton';
import Dropdown from 'Form/Dropdown';
import { HeaderProps } from 'Header';
import classes from 'services/classes';
import './Panel.css';

/**
 * Properties for a dashboard panel, as saved in local storage.
 * This will be extended for each of our panel, in the View.tsx file.
 */
export interface PanelBaseProps {
   type: Readonly<string>;
   rowspan: number;
   colspan: number;
}

/**
 * Properties for a panel component: the same as above, but also support for
 * changing and saving properties interactively.
 */
export interface PanelProps <T extends PanelBaseProps> {
   props: T;

   excludeFields: string[];
   // List of fields with a forced value, that cannot be edited interactively

   save: (p: Partial<T>) => void;
   // Saving the properties of the panel in local storage.
}

/**
 * The list of registered modules. Every type you define a new type of panel,
 * it should be registered in this object
 */
export const PANELS: {[name: string]: React.FC<PanelProps<any>>} = {};

/**
 * The Panel component wraps a view, providing a title bar, settings dialog,..
 */

// ??? cannot use React.FC here because this is a generic, so we do the
// typing manually. The important part is that this component accepts
// children.
interface Props <T extends PanelBaseProps> extends PanelProps<T> {
   header: HeaderProps;  // What header to show for the panel

   Settings?: React.ReactElement|null;
   // if null, no menu at all, not even the default one.
   // if undefined, default menu only.
}

function Panel<T extends PanelBaseProps>(
   p : React.PropsWithChildren<Props<T>>
): React.ReactElement|null {
   const changeRows = (rowspan: number) => p.save({rowspan} as Partial<T>);
   const changeCols = (colspan: number) => p.save({colspan} as Partial<T>);

   const c = classes(
      'panel',
      `dash-${p.props.type}`,
      `row${p.props.rowspan}`,
      `col${p.props.colspan}`,
   );

   return (
      <div className={c} >
         <div className="header">
            <h5>{p.header.title}</h5>
            <div className="group">
               {p.header.buttons}
               {
                  p.Settings !== null &&
                  <Dropdown
                     button={(visible: boolean) =>
                        <RoundButton fa='fa-bars' size='tiny' selected={visible} />
                     }
                     menu={
                        <form>
                           {
                              p.Settings
                           }
                           <fieldset>
                              <legend>Layout</legend>
                              <Select
                                 text="Rows"
                                 value={p.props.rowspan}
                                 onChange={changeRows}
                                 options={[
                                    {text: "one row",    value: 1},
                                    {text: "two rows",   value: 2},
                                    {text: "three rows", value: 3},
                                    {text: "four rows",  value: 4},
                                 ]}
                              />

                              <Select
                                 text="Columns"
                                 value={p.props.colspan}
                                 onChange={changeCols}
                                 options={[
                                    {text: "one column",    value: 1},
                                    {text: "two columns",   value: 2},
                                    {text: "three columns", value: 3},
                                    {text: "four columns",  value: 4},
                                 ]}
                              />
                           </fieldset>
                        </form>
                     }
                  />
               }
               {/*
                  <span className="fa fa-info-circle" />
                  <span className="fa fa-window-close" />
                */ }
            </div>
         </div>
         <div className="content">
            {p.children}
         </div>
      </div>
   );
}

export default Panel;
