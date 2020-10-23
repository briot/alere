export const isNumeric = (str: any): boolean =>  {
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
