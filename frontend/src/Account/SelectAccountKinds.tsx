import * as React from 'react';
import { Option, Select, SelectProps } from '@/Form';
import useAccounts, { AccountKindId } from '@/services/useAccounts';

export interface SelectAccountKindProps
   extends Partial<SelectProps<AccountKindId>> {
}

const SelectAccountKind: React.FC<SelectAccountKindProps> = p => {
   const accounts = useAccounts();

   const options: Option<AccountKindId>[] = React.useMemo(
      () => Object.values(accounts.accounts.allAccountKinds).map(
         k => ({
            value: k.id,
            text: k.name,
         })),
      [accounts.accounts.allAccountKinds]
   );
   return (
      <Select
         {...p}
         value={p.value ?? ''}
         options={options}
      />
   );
}

export default SelectAccountKind;
