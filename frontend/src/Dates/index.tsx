import * as React from 'react';
import { Select } from 'Form';
import RoundButton from 'RoundButton';
import { mod } from 'services/utils';
import './Dates.css';

export type RelativeDate =
   "today"                 |
   "yesterday"             |
   "tomorrow"              |
   "1 month ago"           |
   "2 months ago"          |
   "3 months ago"          |
   "1 year ago"            |
   "2 years ago"           |
   "3 years ago"           |
   "4 years ago"           |
   "5 years ago"           |
   "start of month"        |
   "end of month"          |
   "start of last month"   |
   "end of last month"     |
   "end of 2 months ago"   |
   "end of 3 months ago"   |
   "end of 4 months ago"   |
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
 * same day, last month. When the day doesn't exist, move to the last valid
 * day in that month.
 */
export const addMonth = (d: Date, months: number) => {
   const m = d.getMonth() + months;
   d.setMonth(m);
   if (d.getMonth() !== mod(m, 12)) {
      d.setDate(0);
   }
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
      case "yesterday":           addDay(d, -1);        break;
      case "start of month":      startOfMonth(d, 0);   break;
      case "end of month":        endOfMonth(d, 0);     break;
      case "start of last month": startOfMonth(d, -1);  break;
      case "end of last month":   endOfMonth(d, -1);    break;
      case "end of 2 months ago": endOfMonth(d, -2);    break;
      case "end of 3 months ago": endOfMonth(d, -3);    break;
      case "end of 4 months ago": endOfMonth(d, -4);    break;
      case "1 month ago":         addMonth(d, -1);      break;
      case "2 months ago":        addMonth(d, -2);      break;
      case "3 months ago":        addMonth(d, -3);      break;
      case "1 year ago":          addMonth(d, -12);     break;
      case "2 years ago":         addMonth(d, -24);     break;
      case "3 years ago":         addMonth(d, -36);     break;
      case "4 years ago":         addMonth(d, -48);     break;
      case "5 years ago":         addMonth(d, -60);     break;
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

export const formatDate = (d: Date): string => {
   const y = ('0' + d.getFullYear()).slice(-4);
   const m = ('0' + (d.getMonth() + 1)).slice(-2);
   const day = ('0' + d.getDate()).slice(-2);
   return `${y}-${m}-${day}`;
}

export const dateToString = (when: RelativeDate): string =>
   formatDate(dateToDate(when));

export type DateRange =
   '1day'          |
   '1month'        |
   '2months'       |
   '3months'       |
   '1year'         |
   '2years'        |
   '3years'        |
   '4years'        |
   '5years'        |
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
      case '1day':          return ['yesterday', 'today'];
      case '1month':        return ['1 month ago', 'today'];
      case '2months':       return ['2 months ago', 'today'];
      case '3months':       return ['3 months ago', 'today'];
      case '1year':         return ['1 year ago', 'today'];
      case '2years':        return ['2 years ago', 'today'];
      case '3years':        return ['3 years ago', 'today'];
      case '4years':        return ['4 years ago', 'today'];
      case '5years':        return ['5 years ago', 'today'];
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

const possessive = (name: DateRange): string => {
   switch (name) {
      case '1day':          return "yesterday's";
      case '1month':        return "1 month";
      case '2months':       return "2 months";
      case '3months':       return "3 months";
      case '1year':         return "1 year";
      case '2years':        return "2 years";
      case '3years':        return "3 years";
      case '4years':        return "4 years";
      case '5years':        return "5 years";
      case 'forever':       return "all";
      case 'future':        return "upcoming";
      default:              return name;
   }
}

export const toDates = (name: DateRange): [Date, Date] => {
   const r = rangeToDate(name);
   return [dateToDate(r[0]), dateToDate(r[1])];
}

export const rangeToHttp = (name: DateRange|undefined): string => {
   if (!name) {
      return '';
   }
   const r = rangeToDate(name);
   const min = dateToString(r[0]);
   const max = dateToString(r[1]);
   return `mindate=${min}&maxdate=${max}`;
}

interface RangeDisplay {
   as_dates: string;   // 'from x to y'
   possessive: string; // "z's "
}

export const rangeDisplay = (name: DateRange): RangeDisplay => {
   if (name === 'forever') {
      return {
         as_dates: 'for all dates',
         possessive: "",
      };
   }
   const r = rangeToDate(name);
   const min = dateToString(r[0]);
   const max = dateToString(r[1]);

   return {
      as_dates: `from ${min} to ${max}`,
      possessive: `${possessive(name)} `,
   }
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
      case '1year':
      case 'current year':
      case 'last year':
         return 12;
      case '2years':
         return 24;
      case '3years':
         return 36;
      case '4years':
         return 48;
      case '5years':
         return 60;
      default:
         return NaN;
   }
}

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
         options={[
            {text: "1 day",         value: "1day"},
            {text: "1 month",       value: "1month" },
            {text: "2 months",      value: "2months" },
            {text: "3 months",      value: "3months" },
            {text: "1 year",        value: "1year" },
            {text: "2 years",       value: "2years" },
            {text: "3 years",       value: "3years" },
            {text: "4 years",       value: "4years" },
            {text: "5 years",       value: "5years" },
            {text: "Last month",    value: "last month" },
            {text: "Current month", value: "current month" },
            {text: "Month so far",  value: "month so far" },
            {text: "Last year",     value: "last year" },
            {text: "Current year",  value: "current year" },
            {text: "All dates",     value: "forever" },
            {text: "In the future", value: "future" },
         ]}
      />
   );
}

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
         options={[
            {text: "today",                value: "today"},
            {text: "1 month ago",          value: "1 month ago"},
            {text: "2 months ago",         value: "2 months ago"},
            {text: "3 months ago",         value: "3 months ago"},
            {text: "1 year ago",           value: "1 year ago"},
            {text: "2 year ago",           value: "2 year ago"},
            {text: "3 year ago",           value: "3 year ago"},
            {text: "4 year ago",           value: "4 year ago"},
            {text: "5 year ago",           value: "5 year ago"},
            {text: "start of month",       value: "start of month"},
            {text: "end of month",         value: "end of month"},
            {text: "start of last month",  value: "start of last month"},
            {text: "end of last month",    value: "end of last month"},
            {text: "end of 2 months ago",  value: "end of 2 months ago"},
            {text: "end of 3 months ago",  value: "end of 3 months ago"},
            {text: "end of 4 months ago",  value: "end of 4 months ago"},
            {text: "start of year",        value: "start of year"},
            {text: "start of last year",   value: "start of last year"},
            {text: "end of last year",     value: "end of last year"},
            {text: "end of year before last", value: "end of prev prev year"},
            {text: "earliest date",        value: "epoch"},
            {text: "future",               value: "armageddon"},
         ]}
      />
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

interface DateProps {
   when: Date | undefined;
}
export const DateDisplay: React.FC<DateProps> = p => {
   return (
      <span className="datevalue">
         {p.when && formatDate(p.when)}
      </span>
   );
}
