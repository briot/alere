import * as React from 'react';
import { Option, Select } from 'Form';
import RoundButton from 'RoundButton';
import './Dates.css';

export type RelativeDate =
   "today"                 |
   "tomorrow"              |
   "1 month ago"           |
   "2 months ago"          |
   "3 months ago"          |
   "12 months ago"         |
   "24 months ago"         |
   "36 months ago"         |
   "start of month"        |
   "end of month"          |
   "start of last month"   |
   "end of last month"     |
   "end of 2 months ago"   |
   "start of year"         |
   "start of last year"    |
   "end of last year"      |
   "end of prev prev year" |
   "epoch"                 |
   "armageddon";

/**
 * Modifies d in place to set the last day n months ago
 */
const endOfMonth = (d: Date, months: number) => {
   d.setDate(1);
   d.setMonth(d.getMonth() + months + 1);
   d.setHours(0);
   d.setMinutes(0);
   d.setSeconds(0);
   d.setMilliseconds(-1); // move back to previous month
}

const startOfMonth = (d: Date, months: number) => {
   d.setDate(1);
   d.setMonth(d.getMonth() + months);
   d.setHours(0);
   d.setMinutes(0);
   d.setSeconds(0);
   d.setMilliseconds(0);
}

/**
 * same day, last month
 */
const addMonth = (d: Date, months: number) => {
   d.setMonth(d.getMonth() + months);
}

const addDay = (d: Date, days: number) => {
   d.setDate(d.getDate() + days);
}

/**
 * Modifies d in place to set the last day of the year, n years ago
 */
const endOfYear = (d: Date, years: number) => {
   d.setMonth(11);
   d.setDate(31);
   d.setHours(23);
   d.setMinutes(59);
   d.setSeconds(59);
   d.setFullYear(d.getFullYear() + years);
}

const startOfYear = (d: Date, years: number) => {
   d.setFullYear(d.getFullYear() + years);
   d.setDate(1);
   d.setMonth(0);
   d.setHours(0);
   d.setMinutes(0);
   d.setSeconds(0);
}

export const dateToDate = (when: RelativeDate): Date => {
   let d: Date = new Date();

   switch (when) {
      case "today":               break;
      case "tomorrow":            addDay(d, 1);         break;
      case "start of month":      startOfMonth(d, 0);   break;
      case "end of month":        endOfMonth(d, 0);     break;
      case "start of last month": startOfMonth(d, -1);  break;
      case "end of last month":   endOfMonth(d, -1);    break;
      case "end of 2 months ago": endOfMonth(d, -2);    break;
      case "1 month ago":         addMonth(d, -1);      break;
      case "2 months ago":        addMonth(d, -2);      break;
      case "3 months ago":        addMonth(d, -3);      break;
      case "12 months ago":       addMonth(d, -12);     break;
      case "24 months ago":       addMonth(d, -24);     break;
      case "36 months ago":       addMonth(d, -36);     break;
      case "start of year":
         d.setDate(1);
         d.setMonth(0);
         d.setHours(0);
         d.setMinutes(0);
         d.setSeconds(0);
         break;
      case 'start of last year':    startOfYear(d, -1); break;
      case 'end of last year':      endOfYear(d, -1); break;
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
   return d;
}

export const dateToString = (when: RelativeDate): string => {
   const d = dateToDate(when);
   const y = ('0' + d.getFullYear()).slice(-4);
   const m = ('0' + (d.getMonth() + 1)).slice(-2);
   const day = ('0' + d.getDate()).slice(-2);
   return `${y}-${m}-${day}`;
}

export type DateRange =
   '1day'          |
   '1month'        |
   '3months'       |
   '12months'      |
   '24months'      |
   '36months'      |
   'current month' |
   'month so far'  |
   'last month'    |
   'current year'  |
   'last year'     |
   'forever'       |
   'future'
   ;

const rangeToDate = (name: DateRange): [RelativeDate, RelativeDate] => {
   switch (name) {
      case '1day':          return ['today', 'today'];
      case '1month':        return ['1 month ago', 'today'];
      case '3months':       return ['3 months ago', 'today'];
      case '12months':      return ['12 months ago', 'today'];
      case '24months':      return ['24 months ago', 'today'];
      case '36months':      return ['36 months ago', 'today'];
      case 'current month': return ['start of month', 'end of month'];
      case 'month so far':  return ['start of month', 'today'];
      case 'last month':    return ['start of last month', 'end of last month'];
      case 'current year':  return ['start of year', 'today'];
      case 'last year':     return ['start of last year', 'end of last year'];
      case 'forever':       return ['epoch', 'armageddon'];
      case 'future':        return ['tomorrow', 'armageddon'];
      default:              return ['today', 'today'];
   }
}

export const rangeToHttp = (name: DateRange|undefined): string => {
   if (!name) {
      return '';
   }
   const r = rangeToDate(name);
   return `mindate=${dateToString(r[0])}&maxdate=${dateToString(r[1])}`;
}

export const rangeDisplay = (name: DateRange): string => {
   if (name === 'forever') {
      return 'for all dates';
   } else if (name === "future") {
      return ", upcoming";
   }
   const r = rangeToDate(name);
   return `from ${dateToString(r[0])} to ${dateToString(r[1])}`;
}

export const monthCount = (name: DateRange): number => {
   switch (name) {
      case '1month':
      case 'current month':
      case 'month so far':
      case 'last month':
         return 1;
      case '3months':
         return 3;
      case '12months':
      case 'current year':
      case 'last year':
         return 12;
      case '24months':
         return 24;
      case '36months':
         return 36;
      default:
         return NaN;
   }
   // const r = rangeToDate(name);
   // const r0 = dateToDate(r[0]);
   // let r1 = dateToDate(r[1]);
   // let count = 0;
   // while (r1 >= r0) {
   //    count ++;
   //    r1.setMonth(r1.getMonth() - 1);
   // }
   // return count;
}

const DateRangeOption = (p: {text: string, value: DateRange}) =>
   <Option text={p.text} value={p.value} />

interface DateRangePickerProps {
   onChange?: (val: DateRange) => void;
   text: string;
   value: DateRange;
}
export const DateRangePicker: React.FC<DateRangePickerProps> = p => {
   const { onChange } = p;
   const localChange = React.useCallback(
      (val: string) => onChange?.(val as DateRange),
      [onChange]
   );

   return (
      <Select
         onChange={localChange}
         text={p.text}
         value={p.value}
      >
         <DateRangeOption text="1 day"         value="1day" />
         <DateRangeOption text="1 month"       value="1month" />
         <DateRangeOption text="3 months"      value="3months" />
         <DateRangeOption text="12 months"     value="12months" />
         <DateRangeOption text="24 months"     value="24months" />
         <DateRangeOption text="36 months"     value="36months" />
         <DateRangeOption text="Last month"    value="last month" />
         <DateRangeOption text="Current month" value="current month" />
         <DateRangeOption text="Month so far"  value="month so far" />
         <DateRangeOption text="Last year"     value="last year" />
         <DateRangeOption text="Current year"  value="current year" />
         <DateRangeOption text="All dates"     value="forever" />
         <DateRangeOption text="In the future" value="future" />
      </Select>
   );
}

const DateOption = (p: {text: string, value: RelativeDate}) =>
   <Option text={p.text} value={p.value} />

interface RelativeDatePickerProps {
   onChange?: (val: RelativeDate) => void;
   text: string;
   value: RelativeDate;
}
export const RelativeDatePicker: React.FC<RelativeDatePickerProps> = p => {
   const { onChange } = p;
   const localChange = React.useCallback(
      (val: string) => onChange?.(val as RelativeDate),
      [onChange]
   );

   return (
      <Select
         onChange={localChange}
         text={p.text}
         value={p.value}
      >
         <DateOption text="today"                value="today" />
         <DateOption text="1 month ago"          value="1 month ago" />
         <DateOption text="2 months ago"         value="2 months ago" />
         <DateOption text="3 months ago"         value="3 months ago" />
         <DateOption text="12 months ago"        value="12 months ago" />
         <DateOption text="start of month"       value="start of month" />
         <DateOption text="end of month"         value="end of month" />
         <DateOption text="start of last month"  value="start of last month" />
         <DateOption text="end of last month"    value="end of last month" />
         <DateOption text="end of 2 months ago"  value="end of 2 months ago" />
         <DateOption text="start of year"        value="start of year" />
         <DateOption text="start of last year"   value="start of last year" />
         <DateOption text="end of last year"     value="end of last year" />
         <DateOption text="end of year before last" value="end of prev prev year" />
         <DateOption text="earliest date"        value="epoch" />
         <DateOption text="future"               value="armageddon" />
      </Select>
   );
}


interface MultiDatePickerProps {
   onChange: (val: RelativeDate[]) => void;
   text: string;
   value: RelativeDate[];
}
export const MultiDatePicker: React.FC<MultiDatePickerProps> = p => {
   const { onChange } = p;

   const appendDate = () => {
      onChange([...p.value, "today"]);
   };

   const EditItem = (p2: {idx: number}) => {
      const changeDate = (d: RelativeDate) => {
         onChange([...p.value.slice(0, p2.idx),
                   d,
                   ...p.value.slice(p2.idx + 1)]);
      };
      const removeDate = () => {
         onChange([...p.value.slice(0, p2.idx),
                   ...p.value.slice(p2.idx + 1)]);
      };

      return (
         <div className="row">
            <RelativeDatePicker
               onChange={changeDate}
               text=""
               value={p.value[p2.idx]}
            />
            <RoundButton
               fa="fa-remove"
               size="tiny"
               onClick={removeDate}
            />
         </div>
      );
   }

   return (
      <div className="field multidate">
         <label>{p.text}: </label>
         {
            p.value.map((d, i) => <EditItem idx={i} key={i} />)
         }
         <div className="row">
            <RoundButton
                fa="fa-plus"
                size="small"
                onClick={appendDate}
            />
         </div>
      </div>
   );
}
