import * as React from 'react';

/**
 * Save or load settings from local storage
 */

const useSettings = <T extends {}> (
   key: string,
   defaultValue: T,

   loader: (val: T) => T = val => val,
   saver: (val: T) => T = val => val,
   // Called on load or save, might be used to cleanup values

) => {
   const KEY = `alere-${key}`;
   const [val, setVal] = React.useState<T>(
      () => loader(
         JSON.parse(localStorage.getItem(KEY) || 'null') || defaultValue),
   );

   // Save dashboards when they change
   React.useEffect(
      () => localStorage.setItem(KEY, JSON.stringify(saver(val))),
      [val, KEY, saver]
   );

   const setPartial = React.useCallback(
      (v: Partial<T>) => setVal(old => ({ ...old, ...v })),
      []
   );

   return { val, setPartial, setVal };
}

export default useSettings;
