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

   commodity?: Commodity | CommodityId;
   hideCommodity?: boolean;
}

const Numeric: React.FC<NumericProps> = p => {
   const { accounts } = useAccounts();

   if (p.amount === undefined || p.amount === null || isNaN(p.amount)) {
      return (
         <span className='numeric'>-</span>
      );
   }

   const commodity = typeof(p.commodity) === "number"
      ? accounts.allCommodities[p.commodity]
      : p.commodity;

   const className = classes(
      'numeric',
      p.className,
      p.colored && (p.amount >= 0 ? ' positive' : ' negative'),
   );
   const val = p.amount.toFixed(
      commodity?.qty_scale === undefined
      ? 2 : Math.log10(commodity.qty_scale));

   let str = val.split('.');  // separator used by toFixed
   if (str[0].length >= 4) {
       str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + GROUP_SEP);
   }

   // No adjustment for the decimal part
//   if (str[1] && str[1].length >= 4) {
//       str[1] = str[1].replace(/(\d{3})/g, '$1 ');
//   }

   return (
      <span className={className}>
         {!p.hideCommodity && commodity?.symbol_before
            ? <span className="prefix">{commodity.symbol_before}</span>
            : null
         }
         {str.join(DECIMAL_SEP)}
         {!p.hideCommodity && commodity?.symbol_after
            ? <span className="suffix">{commodity.symbol_after}</span>
            : null
         }
         {p.suffix}
      </span>
   );
}

export default Numeric;
