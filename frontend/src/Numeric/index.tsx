import React from 'react';
import classes from 'services/classes';
import useAccounts, { Commodity, CommodityId } from 'services/useAccounts';
import './Numeric.css';

const DECIMAL_SEP = ','
const GROUP_SEP = ' ';

interface NumericProps {
   amount: number|undefined|null;
   suffix?: string; // extra suffix added after commodity (like "%" or "/month")
   colored?: boolean;
   className?: string;
   forceSign?: boolean;

   commodity?: Commodity | CommodityId;
   hideCommodity?: boolean;
   showArrow?: boolean;
   scale?: number;  // override the commodity's scale (for prices). Set to 0
                    // to round numbers
}

const Numeric: React.FC<NumericProps> = ({
   amount, commodity, className, colored, scale, hideCommodity, suffix,
   forceSign, showArrow,
}) => {
   const { accounts } = useAccounts();

   if (amount === undefined || amount === null || isNaN(amount)) {
      return (
         <span className='numeric'>-</span>
      );
   }

   const comm = typeof(commodity) === "number"
      ? accounts.allCommodities[commodity]
      : commodity;

   const cn = classes(
      'numeric',
      className,
      colored && (amount >= 0 ? ' positive' : ' negative'),
   );
   const val = amount.toFixed(
      scale !== undefined
      ? scale
      : comm?.qty_scale === undefined
      ? 2
      : Math.log10(comm.qty_scale));

   let str = val.split('.');  // separator used by toFixed
   if (str[0].length >= 4) {
       str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + GROUP_SEP);
   }

   const sign = (forceSign && amount >= 0) ? '+' : '';

   // No adjustment for the decimal part
//   if (str[1] && str[1].length >= 4) {
//       str[1] = str[1].replace(/(\d{3})/g, '$1 ');
//   }

   return (
      <span className={cn}>
         {!hideCommodity && comm?.symbol_before
            ? <span className="prefix">{comm.symbol_before}</span>
            : null
         }
         {sign}{str.join(DECIMAL_SEP)}
         {!hideCommodity && comm?.symbol_after
            ? <span className="suffix">{comm.symbol_after}</span>
            : null
         }
         {suffix}
         {
            showArrow &&
            (amount < 0
             ? <span>&#9660;</span>
             : <span>&#9650;</span>)
         }
      </span>
   );
}

export default Numeric;
