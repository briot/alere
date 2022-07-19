#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[macro_use]
extern crate diesel;

#[macro_use]
extern crate diesel_migrations;

pub mod accounts;
pub mod connections;
pub mod cte_accounts;
pub mod cte_list_splits;
pub mod cte_query_balance;
pub mod cte_query_networth;
pub mod dates;
pub mod ledger;
pub mod metrics;
pub mod models;
pub mod occurrences;
pub mod scenarios;
pub mod schema;

use env_logger::Env;

fn main() {
    // Configure logging, with a default to show all traces
    env_logger::Builder::from_env(
        Env::default().default_filter_or("trace")
        ).init();

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
