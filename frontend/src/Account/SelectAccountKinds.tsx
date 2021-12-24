import * as React from 'react';
import { Option, Select, SelectProps, Button } from '@/Form';
import useAccounts, { AccountKindId } from '@/services/useAccounts';

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
                       <th>Stock or Security</th>
                       <td>{k.is_stock ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Non-monetary asset (car,...)</th>
                       <td>{k.is_asset ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Show in Income/Expense</th>
                       <td>{k.is_income_expense ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Work income (salary,...)</th>
                       <td>{k.is_work_income ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Passive income (dividends,...)</th>
                       <td>{k.is_passive_income ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Realized income</th>
                       <td>{k.is_realized_income ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Unrealized income</th>
                       <td>{k.is_unrealized_income ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Expense</th>
                       <td>{k.is_expense ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Income tax</th>
                       <td>{k.is_income_tax ? 'Y' : 'N'}</td>
                    </tr>
                    <tr>
                       <th>Other taxes</th>
                       <td>{k.is_other_tax ? 'Y' : 'N'}</td>
                    </tr>
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
