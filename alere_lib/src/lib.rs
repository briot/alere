pub mod account_lists;
pub mod account_kinds;
pub mod accounts;
pub mod cashflow;
pub mod commodity_kinds;
pub mod commodities;
pub mod connections;
pub mod cte_accounts;
pub mod cte_list_splits;
pub mod cte_query_balance;
pub mod cte_query_networth;
pub mod dates;
pub mod errors;
pub mod income_expense;
pub mod institutions;
pub mod kmymoney_import;
pub mod ledger;
pub mod means;
pub mod metrics;
pub mod models;
pub mod occurrences;
pub mod payees;
pub mod price_sources;
pub mod prices;
pub mod query;
pub mod quotes;
pub mod reconciliation;
pub mod scaling;
pub mod scenarios;
pub mod schema;
pub mod splits;
pub mod transactions;

#[macro_use]
extern crate diesel;

#[macro_use]
extern crate diesel_migrations;

extern crate num;

#[macro_use]
extern crate num_derive;

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}
