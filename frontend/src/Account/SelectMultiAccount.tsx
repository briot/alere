import * as React from 'react';
import useAccountIds, { AccountIdSet } from '@/services/useAccountIds';
import { Account } from '@/services/useAccounts';
import { isArray, isString } from '@/services/utils';
import { Checkbox } from '@/Form';
import ListWithColumns, { Column } from '@/List/ListWithColumns';
import { AlternateRows } from '@/List/ListPrefs';
import useBuildRowsFromAccounts from '@/List/ListAccounts';
import { Select, SharedInputProps, SharedInput } from '@/Form';
import {
   SelectTreeNode, createSelectAccountRow } from '@/Account/SelectAccount';
import "./Account.scss";

interface MultiAccountSelectProps
      extends SharedInputProps<AccountIdSet|undefined>
{
   onChange: (ids: AccountIdSet) => void;

   hide?: (a: Account) => boolean;
   hidden?: AccountIdSet;
   // Two ways to hide account and its children.
}

export const SelectMultiAccount: React.FC<MultiAccountSelectProps> = p => {
   const { accounts } = useAccountIds(p.value);
   const [preselection, setPreselection] = React.useState<string>(
      () => isString(p.value)
            ? p.value
            : isArray(p.value) && p.value.length === 0
            ? 'none'
            : 'custom');

   const onChangePreselection = (a: string) => {
      setPreselection(a);
      if (a === 'none') {
         p.onChange([]);
      } else if (a !== 'custom') {
         p.onChange(a);
      }
   }

   const { accounts: hidden } = useAccountIds(p.hidden);
   const shouldShowAccount = (a: Account) =>
      !hidden.includes(a) && (p.hide === undefined || !p.hide(a));

   const rows = useBuildRowsFromAccounts(
      createSelectAccountRow,
      shouldShowAccount,  // filter account
   );

   const localChange = (node: SelectTreeNode, checked: boolean) => {
      const cp = accounts
         ? accounts.map(a => a.id)
         : rows.map(a => a.data.account?.id || -1);
      if (!node.account) {
      } else if (checked) {
         if (!cp.includes(node.account.id)) {
            if (cp.length === rows.length - 1) {
               p.onChange('all');
            } else {
               p.onChange([...cp, node.account.id]);
            }
         }
      } else {
         cp.splice(cp.indexOf(node.account.id), 1);
         p.onChange(cp);
      }
   };

   const columnAccountName: Column<SelectTreeNode, unknown > = {
      id: 'Account',
      cell: (n: SelectTreeNode) => {
         return n.account ? (
            <Checkbox
               text={n.account.name}
               value={!accounts || accounts.includes(n.account)}
               onChange={(checked: boolean) => localChange(n, checked)}
               disabled={preselection !== 'custom'}
            />
         ) : (
            n.name
         )
      }
   };

   return (
      <SharedInput
         {...p}
         className="multiAccountSelect"
      >
         <div>
            <Select
               onChange={onChangePreselection}
               value={preselection}
               options={[
                  {value: "none"},
                  {value: "all"},
                  {value: "net worth"},
                  {value: "expenses"},
                  {value: "income"},
                  {value: "expense_income", text: "expenses or income"},
                  {value: "custom"},
               ]}
            />

            <ListWithColumns
               className="custom"
               columns={[columnAccountName]}
               rows={rows}
               indentNested={true}
               defaultExpand={true}
               settings={{}}
               hideHeader={true}
               hideFooter={true}
               rowColors={AlternateRows.ROW}
            />
         </div>
      </SharedInput>
   );
}
