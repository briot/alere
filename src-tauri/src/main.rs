#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

#[macro_use]
extern crate diesel;

#[macro_use]
extern crate diesel_migrations;

#[macro_use]
extern crate lazy_static;

pub mod accounts;
pub mod cte_accounts;
pub mod cte_list_splits;
pub mod cte_query_networth;
pub mod cte_query_balance;
pub mod connections;
pub mod dates;
pub mod ledger;
pub mod metrics;
pub mod models;
pub mod occurrences;
pub mod scenarios;
pub mod schema;

fn main() {
  let context = tauri::generate_context!();
  tauri::Builder::default()
    .menu(tauri::Menu::os_default(&context.package_info().name))
    .invoke_handler(tauri::generate_handler![
        metrics::metrics,
        metrics::balance,
        metrics::networth_history,
        accounts::fetch_accounts,
        ledger::ledger,
    ])
    .run(context)
    .expect("error while running tauri application");
}
