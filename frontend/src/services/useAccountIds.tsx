import * as React from 'react';
import useAccounts, { Account, AccountId } from 'services/useAccounts';

/**
 * A user selects accounts for a panel either from an explicit list of
 * account ids, or via a set of named collections of accounts. This package
 * translate from these collections back to a list of ids.
 * Although we could mostly let the backend take care of that internally, we
 * need the ids in the ledger to know what Splits to show.
 */

export type AccountIdSet =
   AccountId[]    // explicit list of ids
   | string       // from a URL, comma-separated list of ids
   | 'all'
   | 'assets'
   | 'expenses'
   | 'income_tax'
   | 'other_taxes'
   | 'passive_income'
   | 'work_income';

export interface AccountList {
   accounts: Account[];
   title: string;   //  Describes the list of accounts, for humans
}

const useAccountIds = (ids: AccountIdSet): AccountList => {
   const { accounts } = useAccounts();

   return React.useMemo(
      () => {
         if (ids === 'all') {
            return {
                accounts: accounts.allAccounts(),
                title: 'all accounts'
                };
         }

         if (ids === 'assets') {
            return {
               accounts: accounts.allAccounts().filter(a => a.kind.is_asset),
               title: 'all assets',
            };
         }

         if (ids === 'work_income') {
            return {
               accounts: accounts.allAccounts().filter(a => a.kind.is_work_income),
               title: 'all work income',
            }
         }

         if (ids === 'passive_income') {
            return {
               accounts: accounts.allAccounts().filter(a => a.kind.is_passive_income),
               title: 'all passive income',
            }
         }

         if (ids === 'expenses') {
            return {
               accounts: accounts.allAccounts().filter(a => a.kind.is_expense),
               title: 'all expenses',
            }
         }

         if (ids === 'income_taxes') {
            return {
               accounts: accounts.allAccounts().filter(a => a.kind.is_income_tax),
               title: 'all income taxes',
            }
         }

         if (ids === 'other_taxes') {
            return {
               accounts: accounts.allAccounts().filter(a => a.kind.is_other_tax),
               title: 'all other taxes',
            }
         }

         const numids = typeof(ids) === 'string'
            ? ids.split(',').map(c => parseInt(c))
            : ids;

         const acc = numids.map(a => accounts.getAccount(a))
               .filter(a => a !== undefined);

         return {
            accounts: acc,
            title: acc.length === 1
               ? acc[0]?.name
               : 'multiple accounts',
         }
      },
      [ids, accounts]
   );
}
export default useAccountIds;
