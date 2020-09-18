import * as React from 'react';

/**
 * Save or load settings from local storage
 */

const useSettings = <T extends {}> (
   key: string,
   defaultValue: T,
) => {
   const KEY = `alere-${key}`;
   const [val, setVal] = React.useState<T>(
      () => JSON.parse(localStorage.getItem(KEY) || 'null') || defaultValue,
   );

   // Save dashboards when they change
   React.useEffect(
      () => localStorage.setItem(KEY, JSON.stringify(val)),
      [val, KEY]
   );

   const setPartial = React.useCallback(
      (v: Partial<T>) => setVal(old => ({ ...old, ...v })),
      []
   );

   return { val, setPartial, setVal };
}

export default useSettings;
