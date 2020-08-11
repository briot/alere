import * as React from 'react';
import { Option, Select } from 'Form';

export type RelativeDate =
   "today"                 |
   "1 month ago"           |
   "2 months ago"          |
   "3 months ago"          |
   "12 months ago"         |
   "start of month"        |
   "end of month"          |
   "start of last month"   |
   "end of last month"     |
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

const startOfYear = (d: Date, years: number) => {
   d.setFullYear(d.getFullYear() + years);
   d.setDate(1);
   d.setMonth(0);
   d.setHours(0);
   d.setMinutes(0);
   d.setSeconds(0);
}

export const dateToString = (when: RelativeDate): string => {
   let d: Date = new Date();

   switch (when) {
      case "today":               break;
      case "start of month":      startOfMonth(d, 0);   break;
      case "end of month":        endOfMonth(d, 0);     break;
      case "start of last month": startOfMonth(d, -1);  break;
      case "end of last month":   endOfMonth(d, -1);    break;
      case "1 month ago":         addMonth(d, -1);      break;
      case "2 months ago":        addMonth(d, -2);      break;
      case "3 months ago":        addMonth(d, -3);      break;
      case "12 months ago":       addMonth(d, -12);     break;
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
   'current month' |
   'month so far'  |
   'last month'    |
   'current year'  |
   'last year'     |
   'forever'
   ;

const rangeToDate = (name: DateRange): [RelativeDate, RelativeDate] => {
   switch (name) {
      case '1day':          return ['today', 'today'];
      case '1month':        return ['1 month ago', 'today'];
      case '3months':       return ['3 months ago', 'today'];
      case '12months':      return ['12 months ago', 'today'];
      case 'current month': return ['start of month', 'end of month'];
      case 'month so far':  return ['start of month', 'today'];
      case 'last month':    return ['start of last month', 'end of last month'];
      case 'current year':  return ['start of year', 'today'];
      case 'last year':     return ['start of last year', 'end of last year'];
      case 'forever':       return ['epoch', 'armageddon'];
      default:              return ['today', 'today'];
   }
}

export const rangeToHttp = (name: DateRange): string => {
   const r = rangeToDate(name);
   return `mindate=${dateToString(r[0])}&maxdate=${dateToString(r[1])}`;
}

export const rangeDisplay = (name: DateRange): string => {
   if (name === 'forever') {
      return 'for all dates';
   }
   const r = rangeToDate(name);
   return `from ${dateToString(r[0])} to ${dateToString(r[1])}`;
}

const DateOption = (p: {text: string, value: DateRange}) =>
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
         <DateOption text="1 day"         value="1day" />
         <DateOption text="1 month"       value="1month" />
         <DateOption text="3 months"      value="3months" />
         <DateOption text="12 months"     value="12months" />
         <DateOption text="Last month"    value="last month" />
         <DateOption text="Current month" value="current month" />
         <DateOption text="Month so far"  value="month so far" />
         <DateOption text="Last year"     value="last year" />
         <DateOption text="Current year"  value="current year" />
         <DateOption text="All dates"     value="forever" />
      </Select>
   );
}
