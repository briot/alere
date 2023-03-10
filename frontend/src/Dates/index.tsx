import * as React from 'react';
import { divider, Option, Select, SharedInputProps } from '@/Form';
import { mod } from '@/services/utils';
import MultipleSelect from '@/Form/MultipleSelect';
import './Dates.scss';

type Ref = Date|undefined;  //  a reference date

/**
 * Display a number of months
 */
export const display_months = (months: number): string => {
   const y = Math.floor(months / 12);
   const m = Math.floor(months - y * 12);
   const y_str = y > 1 ? `${y}y` : '';
   const m_str = m > 0 ? `${m}m` : '';
   return `${y_str} ${m_str}`;
}

/**
 * Number of days between two dates
 */
export const daysCount = (date1: Date, date2: Date): number =>
   (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);

/**
 * Modifies d in place to set the last day n months ago
 */
export const endOfMonth = (months: number, refdate?: Ref) => {
   const d = refdate ? new Date(refdate) : new Date();
   d.setDate(1);
   d.setMonth(d.getMonth() + months + 1);
   d.setHours(0);
   d.setMinutes(0);
   d.setSeconds(0);
   d.setMilliseconds(-1); // move back to previous month
   return d;
}

const startOfMonth = (months: number, refdate?: Ref) => {
   const d = refdate ? new Date(refdate) : new Date();
   d.setDate(1);
   d.setMonth(d.getMonth() + months);
   d.setHours(0);
   d.setMinutes(0);
   d.setSeconds(0);
   d.setMilliseconds(0);
   return d;
}

/**
 * same day, last month. When the day doesn't exist, move to the last valid
 * day in that month.
 */
export const addMonth = (months: number, refdate?: Ref) => {
   const d = refdate ? new Date(refdate) : new Date();
   const m = d.getMonth() + months;
   d.setMonth(m);
   if (d.getMonth() !== mod(m, 12)) {
      d.setDate(0);
   }
   return d;
}

const addDay = (days: number, refdate?: Ref) => {
   const d = refdate ? new Date(refdate) : new Date();
   d.setDate(d.getDate() + days);
   return d;
}

/**
 * Modifies d in place to set the last day of the year, n years ago
 */
const endOfYear = (years: number, refdate?: Ref) => {
   const d = refdate ? new Date(refdate) : new Date();
   d.setMonth(11);
   d.setDate(31);
   d.setHours(23);
   d.setMinutes(59);
   d.setSeconds(59);
   d.setMilliseconds(0);
   d.setFullYear(d.getFullYear() + years);
   return d;
}

const startOfYear = (years: number, refdate?: Ref) => {
   const d = refdate ? new Date(refdate) : new Date();
   d.setFullYear(d.getFullYear() + years);
   d.setDate(1);
   d.setMonth(0);
   d.setHours(0);
   d.setMinutes(0);
   d.setSeconds(0);
   d.setMilliseconds(0);
   return d;
}

interface RelativeDateType {
   group: number;
   toDate: (relativeTo: Ref) => Date;
   text?: string;
}

export type RelativeDate = 'today' | 'yesterday' | 'tomorrow'
   | 'start of month' | 'start of last month' | 'start of 2 months ago'
   | 'start of 3 months ago' | 'start of 4 months ago'
   | 'end of month' | 'end of last month' | 'end of 2 months ago'
   | 'end of 3 months ago' | 'end of 4 months ago'
   | '1 month ago' | '2 months ago' | '3 months ago'
   | '1 year ago' | '2 years ago' | '3 years ago' | '4 years ago'
   | '5 years ago' | 'start of last year' | 'start of year'
   | 'start of 2 years ago' | 'start of 3 years ago'
   | 'start of 4 years ago' | 'start of 5 years ago'
   | 'end of year' | 'end of last year' | 'end of 2 years ago'
   | 'end of 3 years ago' | 'end of 4 years ago' | 'end of 5 years ago'
   | 'epoch' | 'armageddon';

const relativeDates: Record<RelativeDate, RelativeDateType> = {
   "today":                 {group: 0, toDate: (r: Ref) => addDay(0, r)},
   "yesterday":             {group: 0, toDate: (r: Ref) => addDay(-1, r)},
   "tomorrow":              {group: 0, toDate: (r: Ref) => addDay(1, r)},

   "start of month":        {group: 1, toDate: (r: Ref) => startOfMonth(0, r)},
   "start of last month":   {group: 1, toDate: (r: Ref) => startOfMonth(-1, r)},
   "start of 2 months ago": {group: 1, toDate: (r: Ref) => startOfMonth(-2, r)},
   "start of 3 months ago": {group: 1, toDate: (r: Ref) => startOfMonth(-3, r)},
   "start of 4 months ago": {group: 1, toDate: (r: Ref) => startOfMonth(-4, r)},

   "end of month":          {group: 2, toDate: (r: Ref) => endOfMonth(0, r)},
   "end of last month":     {group: 2, toDate: (r: Ref) => endOfMonth(-1, r)},
   "end of 2 months ago":   {group: 2, toDate: (r: Ref) => endOfMonth(-2, r)},
   "end of 3 months ago":   {group: 2, toDate: (r: Ref) => endOfMonth(-3, r)},
   "end of 4 months ago":   {group: 2, toDate: (r: Ref) => endOfMonth(-4, r)},

   "1 month ago":           {group: 3, toDate: (r: Ref) => addMonth(-1, r)},
   "2 months ago":          {group: 3, toDate: (r: Ref) => addMonth(-2, r)},
   "3 months ago":          {group: 3, toDate: (r: Ref) => addMonth(-3, r)},

   "1 year ago":            {group: 4, toDate: (r: Ref) => addMonth(-12, r)},
   "2 years ago":           {group: 4, toDate: (r: Ref) => addMonth(-24, r)},
   "3 years ago":           {group: 4, toDate: (r: Ref) => addMonth(-36, r)},
   "4 years ago":           {group: 4, toDate: (r: Ref) => addMonth(-48, r)},
   "5 years ago":           {group: 4, toDate: (r: Ref) => addMonth(-60, r)},

   "start of year":         {group: 5, toDate: (r: Ref) => startOfYear(0, r)},
   "start of last year":    {group: 5, toDate: (r: Ref) => startOfYear(-1, r)},
   "start of 2 years ago":
      {group: 5, text: "start of year (2 years ago)",
       toDate: (r: Ref) => startOfYear(-2, r)},
   "start of 3 years ago":
      {group: 5, text: "start of year (3 years ago)",
         toDate: (r: Ref) => startOfYear(-3, r)},
   "start of 4 years ago":
      {group: 5, text: "start of year (4 yeears ago)",
         toDate: (r: Ref) => startOfYear(-4, r)},
   "start of 5 years ago":
      {group: 5, text: "start of year (5 yeears ago)",
         toDate: (r: Ref) => startOfYear(-5, r)},

   "end of year":           {group: 6, toDate: (r: Ref) => endOfYear(0, r)},
   "end of last year":      {group: 6, toDate: (r: Ref) => endOfYear(-1, r)},
   "end of 2 years ago":
      {group: 6, text: "end of year (2 years ago)",
       toDate: (r: Ref) => endOfYear(-2, r)},
   "end of 3 years ago":
      {group: 6, text: "end of year (3 years ago)",
       toDate: (r: Ref) => endOfYear(-3, r)},
   "end of 4 years ago":
      {group: 6, text: "end of year (4 years ago)",
       toDate: (r: Ref) => endOfYear(-4, r)},
   "end of 5 years ago":
      {group: 6, text: "end of year (5 years ago)",
       toDate: (r: Ref) => endOfYear(-4, r)},

   "epoch":
      {group: 7, text: "earliest date", toDate: () => new Date(1970, 0, 1)},
   "armageddon":
      {group: 7, text: "future",        toDate: () => new Date(2200, 0, 1)},
}

interface DateRangeType {
   range: [RelativeDate, RelativeDate];
   text?: string;  // for select box, defaults to the key
   group: number;

   months: undefined | number;
   // Number of months elapsed (to compute means).
   // If NaN, no mean will be computed.
   // If undefined, an approximate number of months will be computed using
   // the actual dates, see monthCount.
}

export type DateRange = '1 day' | '1 month' | '2 months' | '3 months'
   | 'current month' | 'month so far' | 'last month' | '1 year' | '2 years'
   | '3 years' | '4 years' | '5 years' | 'current year so far' | 'current year'
   | 'last year' | '2 years ago' | '3 years ago' | '4 years ago'
   | '5 years ago' | 'all' | 'upcoming';

const dateRanges: Record<DateRange, DateRangeType> = {
   '1 day':    {
      range: ['yesterday', 'today'],
      group: 0,
      months: NaN,
   },
   '1 month':       {
      range: ['1 month ago', 'today'],
      group: 1,
      months: 1,
   },
   '2 months':      {
      range: ['2 months ago', 'today'],
      group: 1,
      months: 2,
   },
   '3 months':      {
      range: ['3 months ago', 'today'],
      group: 1,
      months: 3,
   },
   'current month': {
      range: ['start of month', 'end of month'],
      group: 1,
      months: 1,
   },
   'month so far':  {
      range: ['start of month', 'today'],
      group: 1,
      months: 1,
   },
   'last month': {
      range: ['start of last month', 'end of last month'],
      group: 1,
      months: 1,
   },
   '1 year': {
      range: ['1 year ago', 'today'],
      group: 2,
      months: 12,
   },
   '2 years': {
      range: ['2 years ago', 'today'],
      group: 2,
      months: 24,
   },
   '3 years': {
      range: ['3 years ago', 'today'],
      group: 2,
      months: 36,
   },
   '4 years': {
      range: ['4 years ago', 'today'],
      group: 2,
      months: 48,
   },
   '5 years': {
      range: ['5 years ago', 'today'],
      group: 2,
      months: 60,
   },
   'current year so far': {
      range: ['start of year', 'today'],
      group: 3,
      months: undefined,
   },
   'current year': {
      range: ['start of year', 'end of year'],
      group: 3,
      months: 12,
   },
   'last year': {
      range: ['start of last year', 'end of last year'],
      group: 3,
      months: 12,
   },
   '2 years ago': {
      range: ['start of 2 years ago', 'end of 2 years ago'],
      group: 3,
      months: 12,
   },
   '3 years ago': {
      range: ['start of 3 years ago', 'end of 3 years ago'],
      group: 3,
      months: 12,
   },
   '4 years ago': {
      range: ['start of 4 years ago', 'end of 4 years ago'],
      group: 3,
      months: 12,
   },
   '5 years ago': {
      range: ['start of 5 years ago', 'end of 5 years ago'],
      group: 3,
      months: 12,
   },
   'all': {
      range: ['epoch', 'armageddon'],
      text: "All dates",
      group: 4,
      months: NaN,
   },
   'upcoming': {
      range: ['tomorrow', 'armageddon'],
      text: "In the future",
      group: 4,
      months: NaN,
   },
}

export const dateToDate = (
   when: RelativeDate, relativeTo?: Date|undefined
): Date =>
   relativeDates[when]?.toDate(relativeTo) ?? relativeTo ?? new Date();

export const formatDate = (d: Date): string => {
   const y = ('0' + d.getFullYear()).slice(-4);
   const m = ('0' + (d.getMonth() + 1)).slice(-2);
   const day = ('0' + d.getDate()).slice(-2);
   return `${y}-${m}-${day}`;
}

export const dateToString = (
   when: RelativeDate, relativeTo?: Date|undefined
): string =>
   formatDate(dateToDate(when, relativeTo));

const rangeToDate = (name: DateRange): [RelativeDate, RelativeDate] =>
   dateRanges[name]?.range ?? ['today', 'today'];

export const toDates = (
   name: DateRange,
   relativeTo?: Date|undefined,
   roundToMonth?: boolean,
): [Date, Date] => {
   const r = rangeToDate(name);

   const exact_min = dateToDate(r[0], relativeTo);
   const min = roundToMonth ? startOfMonth(0, exact_min) : exact_min;

   const exact_max = dateToDate(r[1], relativeTo);
   const max = roundToMonth ? endOfMonth(0, exact_max) : exact_max;

   return [min, max];
}

export const parseRange = (s: string | undefined): DateRange|undefined =>
  s !== undefined && dateRanges[s as DateRange] ? s as DateRange : undefined;

interface RangeDisplay {
   as_dates: string;   // 'from x to y'
   text: string;
}

export const rangeDisplay = (name: DateRange): RangeDisplay => {
   if (name === 'all') {
      return {
         as_dates: 'for all dates',
         text: '',
      };
   }
   const r = rangeToDate(name);
   const min = dateToString(r[0]);
   const max = dateToString(r[1]);

   return {
      as_dates: `from ${min} to ${max}`,
      text: dateRanges[name]?.text ?? name,
   }
}

export const monthCount = (name: DateRange, relativeTo?: Date): number => {
   const r = dateRanges[name];
   if (r.months !== undefined) {
       return r.months;
   }

   const d = toDates(name, relativeTo);

   // Compute the number of days between the two dates, then the percentage
   // of a year this represents, and compute approximate number of months
   // since we have 12 in a year.
   const days = (d[1].getTime() - d[0].getTime()) / 1000 / 86400;
   const months = Math.round(days * 12 / 365);
   return (months === 0) ? 1 : months;
}

interface DateRangePickerProps {
   onChange?: (
      val: DateRange,
      e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
   text: string;
   value: DateRange;
}
export const DateRangePicker: React.FC<DateRangePickerProps> = p => {
   const { onChange } = p;
   const localChange = React.useCallback(
      (val: string, e: React.MouseEvent<HTMLElement, MouseEvent>) =>
         onChange?.(val as DateRange, e),
      [onChange]
   );
   const groups = Object.entries(dateRanges).reduce(
      (groups, [key, val]) => ({
         prev: val.group,
         options: [
            ...groups.options,
            ...(groups.prev !== val.group ? [divider] : []),
            { text: val.text || key, value: key as DateRange}
         ],
      }),
      {
         prev: 0,
         options: [] as Array<Option<DateRange>>,
      }
   );

   return (
      <Select
         onChange={localChange}
         text={p.text}
         value={p.value}
         options={groups.options}
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

   const groups = Object.entries(relativeDates).reduce(
      (groups, [key, val]) => ({
         prev: val.group,
         options: [
            ...groups.options,
            ...(groups.prev !== val.group ? [divider] : []),
            { text: val.text ?? key, value: key as RelativeDate }
         ],
      }),
      {
         prev: 0,
         options: [] as Array<Option<RelativeDate>>,
      }
   );

   return (
      <Select
         onChange={localChange}
         text={p.text}
         value={p.value}
         options={groups.options}
      />
   );
}

const editOneRange = (v: DateRange, onChange: (v: DateRange) => void) =>
   <DateRangePicker text="" onChange={onChange} value={v} />;
interface MultiRangePickerProps extends SharedInputProps<DateRange[]> {
   onChange: (val: DateRange[]) => void;
}
export const MultiRangePicker: React.FC<MultiRangePickerProps> = p => {
   return (
      <MultipleSelect
         {...p}
         newValue="1 year"
         editOne={editOneRange}
      />
   );
}

const editOneDate = (v: RelativeDate, onChange: (v: RelativeDate) => void) =>
   <RelativeDatePicker text="" onChange={onChange} value={v} />;

interface MultiDatePickerProps extends SharedInputProps<RelativeDate[]> {
   onChange: (val: RelativeDate[]) => void;
}
export const MultiDatePicker: React.FC<MultiDatePickerProps> = p => {
   return (
      <MultipleSelect
         {...p}
         newValue="today"
         editOne={editOneDate}
      />
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
