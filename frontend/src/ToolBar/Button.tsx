import React from 'react';

interface ButtonProps {
   onClick?: () => void;
   label?: string;  // visible text
   icon?: string;
   title?: string;  // tooltip, defaults to {label}

   grows?: boolean;
   // If true, width is not fixed and grows as required by contents
}

const ToolButton: React.FC<ButtonProps> = p => {
   const className = "tool button " + (p.grows ? "grow": "");

   // ??? Should use a real button instead
   return (
      <div className={className} onClick={p.onClick}>
         {p.label}
         {
            p.icon && (
               <span title={p.title ?? p.label} className={'fa ' + p.icon} />
            )
         }
         {p.children}
      </div>
   );
}
export default ToolButton;
