import * as React from 'react';
// import { Option, Select } from '@/Form';
import useAccounts from '@/services/useAccounts';

export interface SelectAccountKindProps {
   value: string|undefined;
}

const SelectAccountKind: React.FC<SelectAccountKindProps> = p => {
   const accounts = useAccounts();

//   const options: Option<AccountKindId>[] = React.useMemo(
//      () => Object.values(accounts.accounts.allAccountKinds).map(
//         k => ({
//            value: k.id,
//            text: k.name,
//         })),
//      [accounts.accounts.allAccountKinds]
//   );
//   return (
//      <Select
//         value={p.value || ''}
//         options={options}
//      />
//   );

   const onClick = React.useCallback(
      e => {
         e.stopPropagation();
      },
      []
   );

   const options = React.useMemo(
      () => {
         const kinds = Object.values(accounts.accounts.allAccountKinds).sort(
            (k1, k2) => k1.name.localeCompare(k2.name)
         );
         return kinds.map(k =>
            <option
               key={k.id}
               selected={k.id === p.value}
               value={k.id}
            >
               {k.name}
            </option>
         );
      },
      [accounts.accounts.allAccountKinds, p.value]
   );
   return (
      <select onClick={onClick}>
         {options}
      </select>
   );
}

export default SelectAccountKind;
