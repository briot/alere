import * as React from 'react';
import useAccountIds, {
   AccountIdSet, PredefinedSets } from '@/services/useAccountIds';
import { Account } from '@/services/useAccounts';
import { isArray, isString } from '@/services/utils';
import { Checkbox } from '@/Form';
import ListWithColumns, { Column, LogicalRow } from '@/List/ListWithColumns';
import { AlternateRows } from '@/List/ListPrefs';
import useBuildRowsFromAccounts from '@/List/ListAccounts';
import { Select, SharedInputProps, SharedInput, Option } from '@/Form';
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

const OPTIONS: Option<PredefinedSetsOrCustom>[] = [
   {value: "none"},
   {value: "all"},
   {value: "networth"},
   {value: "expenses"},
   {value: "income"},
   {value: "expense_income", text: "expenses or income"},
   {value: "custom"},
];

const UNKNOWN_SETTINGS = {}

export const SelectMultiAccount: React.FC<MultiAccountSelectProps> = p => {
   const { hide, onChange } = p;
   const { accounts } = useAccountIds(p.value);
   const ids = React.useMemo(
      () => new Set(accounts.map(a => a.id)),
      [accounts]
   );
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
   const hidden_ids = React.useMemo(
      () => new Set(hidden.map(a => a.id)),
      [hidden]
   );
   const shouldShowAccount = React.useCallback(
      (a: Account) => !hidden_ids.has(a.id) && (hide === undefined || !hide(a)),
      [hidden_ids, hide]
   );

   const rows = useBuildRowsFromAccounts(
      createSelectAccountRow,
      shouldShowAccount,  // filter account
   );

   const localChange = React.useCallback(
      (
         details: LogicalRow<SelectTreeNode, unknown>,
         checked: boolean
      ) => {
         let cp = new Set(ids);

         setPreselection('custom');

         const recurse = (d: LogicalRow<SelectTreeNode, unknown>) => {
            const id = d.data.account?.id;
            if (id === undefined) {
               return;
            }

            if (checked) {
               cp.add(id);
            } else {
               cp.delete(id);
            }

            if (d.getChildren) {
               const children = d.getChildren(d.data, undefined);
               for (const c of children) {
                  recurse(c);
               }
            }
         }

         recurse(details);
         onChange(Array.from(cp));
      },
      [ids, onChange]
   );

   const columns: Column<SelectTreeNode, unknown>[] = React.useMemo(
      () => {
         return [{
            id: 'Account',
            cell: (n: SelectTreeNode, details) => {
               return n.account ? (
                  <Checkbox
                     text={n.account.name}
                     value={ids.has(n.account.id)}
                     onChange={
                        (checked: boolean) => localChange(details.logic, checked)
                     }
                  />
               ) : (
                  n.name
               )
            }
         }];
      },
      [ids, localChange]
   );

   return (
      <SharedInput
         {...p}
         className="multiAccountSelect"
      >
         <div>
            <Select
               onChange={onChangePreselection}
               value={preselection}
               options={OPTIONS}
            />

            <ListWithColumns
               className="custom"
               columns={columns}
               rows={rows}
               indentNested={true}
               defaultExpand={true}
               settings={UNKNOWN_SETTINGS}
               hideHeader={true}
               hideFooter={true}
               rowColors={AlternateRows.ROW}
            />
         </div>
      </SharedInput>
   );
}
