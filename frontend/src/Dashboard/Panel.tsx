import * as React from 'react';
import { Select } from '@/Form';
import RoundButton from '@/RoundButton';
import { PageButton } from '@/Page';
import Dropdown from '@/Form/Dropdown';
import Header, { HeaderProps } from '@/Header';
import { PanelBaseProps, PanelProps } from '@/Dashboard/Props';
import classes from '@/services/classes';
import './Panel.scss';

export type { PanelBaseProps, PanelProps };

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

   className?: string;
}

function Panel<T extends PanelBaseProps>(
   p : React.PropsWithChildren<Props<T>>
): React.ReactElement|null {
   const changeRows = (rowspan: number) => p.save?.({rowspan} as Partial<T>);
   const changeCols = (colspan: number) => p.save?.({colspan} as Partial<T>);

   const c = classes(
      p.className,
      'panel',
      `dash-${p.props.type}`,
      `row${p.props.rowspan}`,
      `col${p.props.colspan}`,
   );

   return (
      <div className={c} >
        {
           !p.props.hidePanelHeader &&
           <div className="header">
              <Header {...p.header}>
                 <PageButton
                     name={p.header.name || '???'}
                     panel={p.props}
                 />
                 {
                    p.Settings !== null &&
                    <Dropdown
                       animate={true}
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
              </Header>
           </div>
        }
        <div className="content">
           {p.children}
        </div>
      </div>
   );
}

export default Panel;
