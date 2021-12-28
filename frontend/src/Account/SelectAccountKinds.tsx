import * as React from 'react';
import { Option, Select, SelectProps, Button } from '@/Form';
import useAccounts, {
   AccountKindId, is_income, is_expense, is_expense_income
} from '@/services/useAccounts';

export interface SelectAccountKindProps
   extends Partial<SelectProps<AccountKindId>> {
}

const SelectAccountKind: React.FC<SelectAccountKindProps> = p => {
   const { accounts }  = useAccounts();

   const tooltip = React.useCallback(
      (id: AccountKindId) => {
         const k = accounts.allAccountKinds[id];
         return (
            <div className="tooltip-base">
               <table>
                 <tbody>
                    <tr>
                       <th>Category</th>
                       <td>{k.category}</td>
                    </tr>
                    <tr>
                       <th>Part of your net worth</th>
                       <td>{k.is_networth ? 'Y' : 'N'}</td>
                    </tr>
                    {
                       k.is_networth &&
                       <tr>
                          <th>Stock or Security</th>
                          <td>{k.is_stock ? 'Y' : 'N'}</td>
                       </tr>
                    }
                    {
                       is_income(k) &&
                       <tr>
                          <th>Work income (salary,...)</th>
                          <td>{k.is_work_income ? 'Y' : 'N'}</td>
                       </tr>
                    }
                    {
                       is_income(k) &&
                       <tr>
                          <th>Passive income (dividends,...)</th>
                          <td>{k.is_passive_income ? 'Y' : 'N'}</td>
                       </tr>
                    }
                    {
                       is_expense(k) &&
                       <tr>
                          <th>Income tax</th>
                          <td>{k.is_income_tax ? 'Y' : 'N'}</td>
                       </tr>
                    }
                    {
                       is_expense(k) &&
                       <tr>
                          <th>Other taxes</th>
                          <td>{k.is_misc_tax ? 'Y' : 'N'}</td>
                       </tr>
                    }
                    {
                       is_expense_income(k) &&
                       <tr>
                          <th>Unrealized</th>
                          <td>{k.is_unrealized ? 'Y' : 'N'}</td>
                       </tr>
                    }
                 </tbody>
               </table>
            </div>
         );
      },
      [accounts]
   );

   const options: Option<AccountKindId>[] = React.useMemo(
      () => {
         const obj = Object.values(accounts.allAccountKinds).map(
         k => ({
            value: k.id,
            text: k.name,
         }));
         obj.sort((a, b) => a.text.localeCompare(b.text));
         return obj;
      },
      [accounts.allAccountKinds]
   );
   return (
      <Select
         {...p}
         value={p.value ?? ''}
         options={options}
         tooltip={tooltip}
      >
         <Button text="+" />
      </Select>
   );
}

export default SelectAccountKind;
