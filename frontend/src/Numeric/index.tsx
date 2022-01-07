import React from 'react';
import classes from '@/services/classes';
import useAccounts, { Commodity, CommodityId } from '@/services/useAccounts';
import Tooltip, { TooltipValue } from '@/Tooltip';
import './Numeric.scss';

const DECIMAL_SEP = ','
const GROUP_SEP = ' ';

interface BaseNumericProps {
   amount: number|undefined|null;
   forceSign?: boolean;
   commodity?: Commodity | CommodityId;
   hideCommodity?: boolean;
   scale?: number;  // override the commodity's scale (for prices). Set to 0
                    // to round numbers
}

interface NumericProps extends BaseNumericProps {
   suffix?: string; // extra suffix added after commodity (like "%" or "/month")
   colored?: boolean;
   className?: string;
   showArrow?: boolean;
   tooltip?: TooltipValue<unknown>;
}

interface Formatted {
   positive?: boolean;  // undefined when we had no value
   text: string;
   prefix?: string;
   suffix?: string;
}

export const useNumericFormat = (p: BaseNumericProps): Formatted => {
   const { accounts } = useAccounts();

   if (p.amount === undefined || p.amount === null || isNaN(p.amount)) {
      return {
         text: "-",
      }
   }

   const comm = typeof(p.commodity) === "number"
      ? accounts.allCommodities[p.commodity]
      : p.commodity;

   const val = p.amount.toFixed(
      p.scale !== undefined
      ? p.scale
      : 2
      //  Should get from account.commodity_scu
      // : Math.log10(comm.qty_scale)
   );

   let str = val.split('.');  // separator used by toFixed
   if (str[0].length >= 4) {
       str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + GROUP_SEP);
   }

   const positive = p.amount >= 0;
   const sign = (p.forceSign && positive) ? '+' : '';

   // No adjustment for the decimal part
//   if (str[1] && str[1].length >= 4) {
//       str[1] = str[1].replace(/(\d{3})/g, '$1 ');
//   }

   return {
      positive,
      text: `${sign}${str.join(DECIMAL_SEP)}`,
      prefix: !p.hideCommodity && comm?.symbol_before
         ? comm.symbol_before : undefined,
      suffix: !p.hideCommodity && comm?.symbol_after
         ? comm.symbol_after : undefined,
   }
}

const Numeric: React.FC<NumericProps> = p => {
   const f = useNumericFormat(p);
   const cn = classes(
      'numeric',
      p.className,
      p.colored && (f.positive ? ' positive' : ' negative'),
   );

   if (f.positive === undefined) {
      return <span className={cn}>{f.text}</span>;
   }

   return (
      <Tooltip tooltip={p.tooltip}>
         <span className={cn}>
            {f.prefix && <span className="prefix">{f.prefix}</span>}
            {f.text}
            {f.suffix && <span className="suffix">{f.suffix}</span>}
            {p.suffix}
            {
               p.showArrow &&
               (f.positive
                ? <span>&#9650;</span>
                : <span>&#9660;</span>)
            }
         </span>
      </Tooltip>
   );
}

export default Numeric;
