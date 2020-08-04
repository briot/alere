import React from 'react';
import './ToolBar.css';
import Button from './Button';

/**
 * A toolbar displays one or more buttons, aligned horizontally or vertically.
 */

interface BarProps {
   background?: boolean;  // whether to include the gray background bar
}
const Bar: React.FC<BarProps> = p => {
   const className = 'tools horiz'
      + (p.background ? ' background' : '');
   return (
      <div className={className} >
         {p.children}
      </div>
   );
}

/**
 * Items can be grouped: within the group, the buttons will be packed to use
 * minimal space.
 */

interface GroupProps {
}
const Group: React.FC<GroupProps> = p => {
   return (
      <div className='group'>
         {p.children}
      </div>
   );
}

export default {
   Bar,
   Button,
   Group,
}
