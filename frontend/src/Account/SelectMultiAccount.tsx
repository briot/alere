import * as React from 'react';
import useAccountIds, {
   AccountIdSet, PredefinedSets } from '@/services/useAccountIds';
import { Account } from '@/services/useAccounts';
import { isArray, isString } from '@/services/utils';
import { Checkbox } from '@/Form';
import ListWithColumns, { Column, LogicalRow } from '@/List/ListWithColumns';
import { AlternateRows } from '@/List/ListPrefs';
import useBuildRowsFromAccounts from '@/List/ListAccounts';
import { Select, SharedInputProps, SharedInput } from '@/Form';
import {
   SelectTreeNode, createSelectAccountRow } from '@/Account/SelectAccount';
import "./Account.scss";

interface MultiAccountSelectProps extends SharedInputProps<AccountIdSet> {
   onChange: (ids: AccountIdSet) => void;

   hide?: (a: Account) => boolean;
   hidden?: AccountIdSet;
   // Two ways to hide account and its children.
}

type PredefinedSetsOrCustom = PredefinedSets | 'custom' | 'none';

export const SelectMultiAccount: React.FC<MultiAccountSelectProps> = p => {
   const { hide, onChange } = p;
   const { accounts } = useAccountIds(p.value);
   const [preselection, setPreselection] =
      React.useState<PredefinedSetsOrCustom>(
      () => isString(p.value)
            ? p.value
            : isArray(p.value) && p.value.length === 0
            ? 'none'
            : 'custom');

   const onChangePreselection = React.useCallback(
      (a: PredefinedSetsOrCustom) => {
         setPreselection(a);
         if (a === 'none') {
            onChange([]);
         } else if (a !== 'custom') {
            onChange(a);
         }
      },
      [onChange]
   )

   const { accounts: hidden } = useAccountIds(p.hidden);
   const shouldShowAccount = React.useCallback(
      (a: Account) => !hidden.includes(a) && (hide === undefined || !hide(a)),
      [hidden, hide]
   );

   const rows = useBuildRowsFromAccounts(
      createSelectAccountRow,
      shouldShowAccount,  // filter account
   );

   const localChange = (
         details: LogicalRow<SelectTreeNode, unknown>,
         checked: boolean
   ) => {
      let cp = accounts.map(a => a.id);

      const enableRecursive = (d: LogicalRow<SelectTreeNode, unknown>) => {
         const id = d.data.account?.id;
         if (id === undefined) {
            return;
         }

         if (!cp.includes(id)) {
            cp = [...cp, id];
         }

         if (d.getChildren) {
            const children = d.getChildren(d.data, undefined);
            for (const c of children) {
               enableRecursive(c);
            }
         }
      }

      const disableRecursive = (d: LogicalRow<SelectTreeNode, unknown>) => {
         const id = d.data.account?.id;
         if (id === undefined) {
            return;
         }

         cp.splice(cp.indexOf(id), 1);

         if (d.getChildren) {
            const children = d.getChildren(d.data, undefined);
            for (const c of children) {
               disableRecursive(c);
            }
         }
      }


      if (checked) {
         enableRecursive(details);
      } else {
         disableRecursive(details);
      }

      p.onChange(cp);
   };

   const columnAccountName: Column<SelectTreeNode, unknown > = {
      id: 'Account',
      cell: (n: SelectTreeNode, details) => {
         return n.account ? (
            <Checkbox
               text={n.account.name}
               value={!accounts || accounts.includes(n.account)}
               onChange={
                  (checked: boolean) => localChange(details.logic, checked)
               }
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
                  {value: "networth"},
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
