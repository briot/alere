import * as React from 'react';
import './RoundButton.css';

interface RoundButtonProps {
   fa?: string;     // font-awesome icon name
   img?: string;    // or image url

   text?: string;   // shown besides the round button
   title?: string;  // tooltip
   selected?: boolean;

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
      </>
   );

   const c = `roundButton ${p.selected ? 'selected' : ''}`;

   return (
      p.onClick
      ? (
         <div
            className={c}
            onClick={p.onClick}
            title={p.title}
         >
            {children}
         </div>
      ) : (
         <a
            href={p.url || '#a'}
            className={c}
            title={p.title}
         >
            {children}
         </a>
      )
   );
}

export default RoundButton;
