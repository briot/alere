import * as React from 'react';
import { Select } from '@/Form';
import RoundButton from '@/RoundButton';
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

   Settings?: null | (() => React.ReactElement);
   // if null, no menu at all, not even the default one.
   // if undefined, default menu only.

   className?: string;

   fixedSize?: boolean;
   // if true, the panel doesn't grow to occupy as much space as it is
   // allowed. Only applicable when in side panels.
}

function Panel<T extends PanelBaseProps>(
   p : React.PropsWithChildren<Props<T>>
): React.ReactElement|null {
   const [ minimized, setMinimized ] = React.useState(false);
   const changeRows = (rowspan: number) => p.save?.({rowspan} as Partial<T>);
   const changeCols = (colspan: number) => p.save?.({colspan} as Partial<T>);

   const onMinimize = React.useCallback(
      () => setMinimized(old => !old),
      []
   )

   const c = classes(
      p.className,
      'panel',
      `dash-${p.props.type}`,
      minimized ? 'row0' : `row${p.props.rowspan}`,
      minimized ? 'col0' : `col${p.props.colspan}`,
      p.fixedSize && 'fixedsize',
   );

   return (
      <div className={c} >
        {
           !p.props.hidePanelHeader &&
           <Header
               {...p.header}
               panel={p.props.allowMaximize ? p.props : undefined}
           >
              {
                 p.Settings !== null &&
                 <Dropdown
                    animate={true}
                    button={(visible: boolean) =>
                       <RoundButton fa='fa-bars' size='tiny' selected={visible} />
                    }
                    menu={() =>
                       <form>
                          {
                             p.Settings?.()
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
              {
                 p.props.allowCollapse &&
                 <RoundButton
                    fa="fa-minus"
                    tooltip="Minimize this widget"
                    size="tiny"
                    onClick={onMinimize}
                 />
              }
              {/*
                 <span className="fa fa-info-circle" />
                 <span className="fa fa-window-close" />
               */ }
           </Header>
        }
        {
           !minimized &&
           <div className="content">
              {p.children}
           </div>
        }
      </div>
   );
}

export default Panel;
