import * as React from 'react';
import './Panel.css';

interface PanelProps {
   header?: string;
   className?: string;
}

const Panel: React.FC<PanelProps> = p => {
   return (
      <div className={`panel ${p.className || ''}`}>
         {
            p.header &&
            <div className="header">
               <h1>{p.header}</h1>
               <span className="fa fa-bars" />
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
