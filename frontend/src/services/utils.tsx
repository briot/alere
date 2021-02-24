export const DAY_MS = 86400000;

export const isNumeric = (str: unknown): boolean =>  {
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

export const capitalize = (str: string): string => {
   return (
      str.charAt(0).toLocaleUpperCase()
      + str.substring(1)
   );
}


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
      ? 'most recent'
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
