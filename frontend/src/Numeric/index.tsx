import React from 'react';
import classes from 'services/classes';
import './Numeric.css';

const DECIMAL_SEP = ','
const GROUP_SEP = ' ';

interface NumericProps {
   amount: number|undefined|null;
   unit?: string;
   suffix?: string;
   scale?: number;  //  100 => precision is 0.01
   colored?: boolean;
   className?: string;
}

const Numeric: React.FC<NumericProps> = p => {
   if (p.amount === undefined || p.amount === null || isNaN(p.amount)) {
      return (
         <span className='numeric'>-</span>
      );
   }

   const className = classes(
      'numeric',
      p.className,
      p.colored && (p.amount >= 0 ? ' positive' : ' negative'),
   );
   const val = p.amount.toFixed(
      p.scale === undefined ? 2 : Math.log10(p.scale));

   let str = val.split('.');  // separator used by toFixed
   if (str[0].length >= 4) {
       str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + GROUP_SEP);
   }

   // No adjustment for the decimal part
//   if (str[1] && str[1].length >= 4) {
//       str[1] = str[1].replace(/(\d{3})/g, '$1 ');
//   }

   const currencySymbol = (
      p.unit === 'EUR'
      ? <span>&euro;</span>
      : p.unit === 'USD'
      ? <span>$</span>
      : p.unit === 'pound'
      ? <span>&pound;</span>
      : p.unit
      ? <span>{p.unit}</span>
      : null
   );

   return (
      <span className={className}>
         {str.join(DECIMAL_SEP)}
         {currencySymbol}
         {p.suffix}
      </span>
   );
}

export default Numeric;
