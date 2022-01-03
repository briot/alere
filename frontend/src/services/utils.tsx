import * as d3TimeFormat from 'd3-time-format';

export const DAY_MS = 86400000;

export const isNumeric = (str: unknown): str is number =>  {
   if (typeof str === "number") {
      return true;
   }
   if (typeof str !== "string") {
       return false;
   }
   return !isNaN(str as any)
             // use type coercion to parse the _entirety_ of the
             // string (`parseFloat` alone does not do this)...
          && !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export const isString = (s: any): s is string => typeof(s) === "string";
export const isFunc = (s: any): s is Function => typeof(s) === "function";
export const isArray = <T, >(s: any): s is Array<T> => Array.isArray(s);

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(n, min));

export const capitalize = (str: string): string => {
   return (
      str.charAt(0).toLocaleUpperCase()
      + str.substring(1)
   );
}

/**
 * Javascript handles modulo strangely with negative numbers:
 * For instance, when computing with months, twelve months ago is
 *   (2 - 12) % 12    => -10 in javascript
 * With this function, we get 2 as expected
 */
export const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Human-readable description of a date. This is an approximation, so
 * that we can display "6m" when we are approximately 6 months in the past,
 * give or take a few days.
 * @param ms:
 *    number of milliseconds in the past when the date occurred
 */
export const humanDateInterval = (ms: number) => {
   const d = ms / DAY_MS;
   return ms === 0
      ? 'last'
      : (Math.abs(d - 30) < 2)
      ? '1m'
      : (Math.abs(d - 90) < 10)
      ? '3m'
      : (Math.abs(d - 180) < 10)
      ? '6m'
      : (Math.abs(d - 365) < 10)
      ? '1y'
      : (Math.abs(d - 365 * 5) < 10)
      ? '5y'
      : `${Math.floor(d).toFixed(0)}d`;
}

/**
 * Formatting dates
 */
export const dateForm = d3TimeFormat.timeFormat("%Y-%m-%d");

/**
 * Given an array, creates one or more arrays by grouping item using a key.
 * For instance:
 *   const arr = [{a: 1, b: 2}, {a: 1, b: 3}, {a: 3, b: 4}]
 *   const groupByA = groupBy('a');
 *   groupByA(arr)
 * gives:
 *   {1: [{a: 1, b: 2}, {a: 1, b: 3}], 3: [{a: 3, b: 4}]}
 */

export const groupBy = <
   T extends Record<string|number, any>,
   K extends keyof T
>(
   array: T[] | undefined, key: K
): Record<T[K], T[]> => (array ?? []).reduce(
   (byVal, obj) => {
      const value = obj[key]
      byVal[value] = (byVal[value] || []).concat(obj)
      return byVal
   },
   {} as Record<T[K], T[]>
)

/**
 * Compare two numbers, including NaN, for use when sorting tables
 */
export const numComp = (n1: number, n2: number) =>
   isNaN(n1) ? -1
   : isNaN(n2) ? 1
   : n1 - n2;

