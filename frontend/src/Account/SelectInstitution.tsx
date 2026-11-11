import * as React from 'react';
import { Option, Select, SelectProps } from '@/Form';
import useAccounts, { InstitutionId } from '@/services/useAccounts';

export interface SelectInstitutionProps
   extends Partial<SelectProps<InstitutionId>> {
}

const SelectInstitution: React.FC<SelectInstitutionProps> = p => {
   const accounts = useAccounts();
   const options: Option<InstitutionId>[] = React.useMemo(
      () => Object.values(accounts.accounts.allInstitutions).map(
         k => ({
            value: k.id,
            text: k.name,
         })),
      [accounts.accounts.allInstitutions]
   );
   return (
      <Select
         {...p}
         value={p.value ?? -1}
         options={options}
      />
   );
}

export default SelectInstitution;
