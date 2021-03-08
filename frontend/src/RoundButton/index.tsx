import * as React from 'react';
import { Link } from "react-router-dom";
import Tooltip from 'Tooltip';
import './RoundButton.scss';

interface RoundButtonProps {
   fa?: string;     // font-awesome icon name
   img?: string;    // or image url

   text?: string;   // shown besides the round button
   tooltip?: string;
   selected?: boolean;
   disabled?: boolean;
   size?: 'tiny'|'small'|'normal'|'large';

   url?: string;          // the button should be a link
   onClick?: () => void;  // or a custom callback
}

const RoundButton: React.FC<RoundButtonProps> = p => {
   const children = (
      <>
      {
         p.fa
         ? <span className={`morph fa ${p.fa}`} />
         : <span className={`morph`}>
              <img src={p.img} alt="" />
           </span>
      }
      {
         p.text &&
         <span>{p.text}</span>
      }
      {
         p.children
      }
      </>
   );

   const c = `roundButton ${p.selected ? 'selected' : ''} ${p.disabled ? 'disabled': ''} ${p.size || 'normal'}`;

   return (
      <Tooltip tooltip={p.tooltip} >
      {
         p.onClick
         ? (
            <div
               className={c}
               onClick={p.onClick}
            >
               {children}
            </div>
         ) : p.url
         ? (
            <Link
               to={p.url || '#a'}
               className={c}
            >
               {children}
            </Link>
         ) : (
            <div className={c} >
               {children}
            </div>
         )
      }
      </Tooltip>
   );
}

export default RoundButton;
