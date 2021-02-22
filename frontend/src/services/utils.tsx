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
