import * as React from 'react';
import { Link } from "react-router-dom";
import Tooltip from '@/Tooltip';
import classes from '@/services/classes';
import './RoundButton.scss';

export type ButtonSizes = 'tiny'|'small'|'normal'|'large';
export type ButtonAspect = 'morph' | 'flat' | 'noborder';

interface RoundButtonProps {
   fa?: string;     // font-awesome icon name
   img?: string;    // or image url

   text?: string;   // shown besides the round button
   tooltip?: string;
   selected?: boolean;
   disabled?: boolean;
   size?: ButtonSizes;

   aspect?: ButtonAspect;

   url?: string;          // the button should be a link

   onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
   // or a custom callback
}

const RoundButton: React.FC<RoundButtonProps> = p => {
   const children_class = classes(
      p.aspect ?? "morph",
      p.fa && 'fa',
      p.fa,
   )

   const children = (
      <>
      {
         p.img
         ? <span className={children_class} >
              <img src={p.img} alt="" />
           </span>
         : <span className={children_class} />
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

   const c = classes(
      'roundButton',
      p.selected && 'selected',
      p.disabled && 'disabled',
      p.size ?? 'normal',
      !p.text && !p.children && 'noexpand',
   );

   return (
      <Tooltip tooltip={p.tooltip ?? p.text} >
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
