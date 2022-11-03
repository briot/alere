pub mod connections;
pub mod cte_accounts;
pub mod cte_list_splits;
pub mod cte_query_balance;
pub mod cte_query_networth;
pub mod dates;
pub mod models;
pub mod occurrences;
pub mod query;
pub mod scenarios;
pub mod schema;
pub mod splits;

#[macro_use]
extern crate diesel;

#[macro_use]
extern crate diesel_migrations;

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}
