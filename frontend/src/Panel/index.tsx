import * as React from 'react';
import RoundButton from 'RoundButton';
import './Panel.css';

/**
 * Passed to any widget that can be displayed in a panel. The widget can call
 * setHeader to change either the page's header, or a panel's header,...
 */
export interface SetHeaderProps {
   setHeader?: (title: string|undefined) => void;
}

interface PanelProps {
   header?: string;
   className?: string;
   cols?: number;
   rows?: number;
   settings?: () => React.ReactElement|null;
}

const Panel: React.FC<PanelProps> = p => {
   const [visible, setVisible] = React.useState(false);

   const showSettings = React.useCallback(
      () => setVisible(old => !old),
      []
   );

   const c = 'panel '
      + (p.className || '')
      + (p.rows ? ` row${p.rows}` : '')
      + (p.cols ? ` col${p.cols}` : '');

   const settings = visible ? p.settings?.() : null;

   return (
      <div className={c}>
         {
            (p.header || p.settings) &&
            <div className="header">
               <h1>{p.header || ''}</h1>

               {p.settings &&
                  <div>
                     <RoundButton
                        fa='fa-bars'
                        selected={visible}
                        size='tiny'
                        onClick={showSettings}
                     />
                     <div
                        className={`settings ${visible && settings ? 'opened' : 'closed'}` }
                     >
                        {settings}
                     </div>
                  </div>
               }
               {/*
                  <span className="fa fa-info-circle" />
                  <span className="fa fa-window-close" />
                */ }
            </div>
         }
         <div className="content">
            {p.children}
         </div>
      </div>
   );
}

export default Panel;
