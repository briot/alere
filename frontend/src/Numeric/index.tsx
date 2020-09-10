import React from 'react';
import './Numeric.css';

const DECIMAL_SEP = ','
const GROUP_SEP = ' ';

interface NumericProps {
   currency?: string;
   amount: number|undefined|null;
   precision?: number;
}

const Numeric: React.FC<NumericProps> = p => {
   if (p.amount === undefined || p.amount === null || isNaN(p.amount)) {
      return (
         <span className='numeric'>-</span>
      );
   }

   const className = 'numeric ' + (p.currency ?? '');
   const val = p.amount.toFixed(p.precision ?? 2);

   let str = val.split('.');  // separator used by toFixed
   if (str[0].length >= 4) {
       str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + GROUP_SEP);
   }

   // No adjustment for the decimal part
//   if (str[1] && str[1].length >= 4) {
//       str[1] = str[1].replace(/(\d{3})/g, '$1 ');
//   }

   return (
      <span className={className}>{str.join(DECIMAL_SEP)}</span>
   );
}

export default Numeric;
