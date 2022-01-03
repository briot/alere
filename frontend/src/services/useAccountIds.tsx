/**
 * A user selects accounts for a panel either from an explicit list of
 * account ids, or via a set of named collections of accounts. This package
 * translate from these collections back to a list of ids.
 */

import * as React from 'react';
import useAccounts, {
   Account, AccountId,
   is_realized_income, is_unrealized_income, is_misc_income, is_expense,
   is_expense_income, is_income, is_networth,
} from '@/services/useAccounts';
import { isString, isArray } from '@/services/utils';

/**
 * The data that the user provides: either a named predefined set, or an
 * actual list of ids
 */
export type PredefinedSets =
   'all'
   | 'expenses'
   | 'income'
   | 'expense_income'
   | 'networth'   // owned by user
   | 'income_tax'
   | 'realized_income'
   | 'unrealized_income'
   | 'other_income'  // all income - work income - passive income
   | 'other_taxes'
   | 'passive_income'
   | 'work_income';
export type AccountIdSet = undefined | AccountId[] | PredefinedSets;

/**
 * Once resolved, we get a set of accounts
 */

export interface AccountSet {
   accounts: Account[];
   title: string;   //  Describes the list of accounts, for humans
}

const filters: Record<
   PredefinedSets,
   [
      string,  // title
      (a: Account) => boolean,
   ]> =
{
   'all':             ['all accounts',        a => true],
   'expenses':        ['expenses',            a => is_expense(a.kind)],
   'income':          ['income',              a => is_income(a.kind)],
   'expense_income':  ['expenses and income', a => is_expense_income(a.kind)],
   'networth':        ['net worth',           a => is_networth(a.kind)],
   'income_tax':      ['income taxes',        a => a.kind.is_income_tax],
   'realized_income': ['realized income',     a => is_realized_income(a.kind)],
   'unrealized_income': [
      'unrealized income', a => is_unrealized_income(a.kind)],
   'other_income':    ['other income',        a => is_misc_income(a.kind)],
   'other_taxes':     ['taxes except income', a => a.kind.is_misc_tax],
   'passive_income':  ['passive income',      a => a.kind.is_passive_income],
   'work_income':     ['work income',         a => a.kind.is_work_income],
};


const useAccountIds = (ids: AccountIdSet): AccountSet => {
   const { accounts } = useAccounts();
   return React.useMemo(
      () => {
         if (isString(ids)) {
            const v = filters[ids];
            return {
               accounts: accounts.allAccounts().filter(v[1]),
               title: v[0],
            };
         } else if (isArray(ids)) {
            const acc = ids
               .map(a => accounts.getAccount(a))
               .filter(a => a !== undefined);
            return {
               accounts: acc,
               title: acc.length === 1 ? acc[0]?.name : 'multiple accounts',
            };
         } else {
            return {
               accounts: [],
               title: '',
            };
         }
      },
      [ids, accounts]
   );
}
export default useAccountIds;
