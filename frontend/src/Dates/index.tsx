
export type RelativeDate =
   undefined |
   "today" |
   "end of last month" |
   "2 months ago" |
   "3 months ago" |
   "12 months ago" |
   "start of year" |
   "end of prev year" |
   "end of prev prev year" |
   "epoch" |
   "armageddon";

/**
 * Modifies d in place to set the last day n months ago
 */
const endOfMonth = (d: Date, months: number) => {
   d.setDate(1);
   d.setMonth(d.getMonth() + months);
   d.setHours(0);
   d.setMinutes(0);
   d.setSeconds(0);
   d.setMilliseconds(-1);
}

/**
 * Modifies d in place to set the last day of the year, n years ago
 */
const endOfYear = (d: Date, years: number) => {
   d.setFullYear(d.getFullYear() + years);
   d.setDate(31);
   d.setMonth(11);
   d.setHours(23);
   d.setMinutes(59);
   d.setSeconds(59);
}

export const toDate = (when: RelativeDate): string => {
   let d: Date = new Date();

   switch (when) {
      case "today":             break;
      case "end of last month": endOfMonth(d, -1);  break;
      case "2 months ago":      endOfMonth(d, -2);  break;
      case "3 months ago":      endOfMonth(d, -3);  break;
      case "12 months ago":     endOfMonth(d, -12); break;
      case "start of year":
         d.setDate(1);
         d.setMonth(0);
         d.setHours(0);
         d.setMinutes(0);
         d.setSeconds(0);
         break;
      case 'end of prev year':      endOfYear(d, -1); break;
      case 'end of prev prev year': endOfYear(d, -2); break;
      case "epoch":
         d.setDate(1);
         d.setMonth(0);
         d.setFullYear(1970);
         break;
      case "armageddon":
         d.setDate(1);
         d.setMonth(0);
         d.setFullYear(2200);
         break;
      default:
         break;
   }

   const y = ('0' + d.getFullYear()).slice(-4);
   const m = ('0' + (d.getMonth() + 1)).slice(-2);
   const day = ('0' + d.getDate()).slice(-2);
   return `${y}-${m}-${day}`;
}
