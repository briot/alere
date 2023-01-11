#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

pub mod connections;

use alere_lib::models::{AccountId, CommodityId};
use alere_lib::quotes::{ForAccount, Symbol};
use chrono::{DateTime, Utc};
use env_logger::Env;
use log::info;
use std::collections::HashMap;
use tauri::{Menu, CustomMenuItem, MenuItem, Submenu};

fn create_menu() -> Menu {
    Menu::new()
    .add_submenu(Submenu::new(
        "File",
        Menu::new()
        .add_item(CustomMenuItem::new("new_file", "New..."))
//        .add_submenu(Submenu::new(
//            "New",
//            Menu::new()
//            .add_item(CustomMenuItem::new("new_empty",    "From Scratch"))
//            .add_item(CustomMenuItem::new("new_kmymoney", "From KmyMoney"))
//        ))
        .add_item(CustomMenuItem::new("open_file", "Open..."))
        .add_native_item(MenuItem::Quit)
    )).add_submenu(Submenu::new(
        "Edit",
        Menu::new()
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
    )).add_submenu(Submenu::new(
        "Tools",
        Menu::new()
        .add_item(CustomMenuItem::new("update_prices", "Update Prices"))
        .add_item(CustomMenuItem::new("settings", "Settings..."))
    )).add_submenu(Submenu::new(
        "Window",
        Menu::new()
        .add_native_item(MenuItem::Minimize)
        .add_native_item(MenuItem::CloseWindow)
    ))
}

#[tauri::command]
async fn fetch_accounts() -> alere_lib::accounts::Accounts {
    let connection = crate::connections::get_connection();
    alere_lib::accounts::fetch_accounts(connection).await
}

#[tauri::command]
async fn quotes(
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
    commodities: Option<Vec<CommodityId>>,
    accounts: Option<Vec<AccountId>>
) -> (Vec<Symbol>, HashMap<AccountId, ForAccount>) {
    let connection = crate::connections::get_connection();
    alere_lib::quotes::quotes(
        connection, mindate, maxdate, currency, commodities,
        accounts).await
}

#[tauri::command]
async fn income_expense(
    income: bool,
    expense: bool,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> alere_lib::income_expense::IncomeExpenseInPeriod {
    let connection = crate::connections::get_connection();
    alere_lib::income_expense::income_expense(
        connection, income, expense, mindate, maxdate, currency
    ).await
}

#[tauri::command]
async fn balance(
    dates: Vec<DateTime<Utc>>,
    currency: CommodityId,
) -> Vec<alere_lib::metrics::PerAccount> {
    let connection = crate::connections::get_connection();
    alere_lib::metrics::balance(connection, dates, currency).await
}

#[tauri::command]
async fn metrics(
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> alere_lib::metrics::Networth {
    let connection = crate::connections::get_connection();
    alere_lib::metrics::metrics(
        connection, mindate, maxdate, currency).await
}

#[tauri::command]
async fn networth_history(
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> Vec<alere_lib::metrics::NWPoint> {
    let connection = crate::connections::get_connection();
    alere_lib::metrics::networth_history(
       connection, mindate, maxdate, currency).await
}

#[tauri::command]
async fn mean(
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
    prior: u8,
    after: u8,
    unrealized: bool,
) -> Vec<alere_lib::means::Point> {
    let connection = crate::connections::get_connection();
    alere_lib::means::mean(
        connection, mindate, maxdate, currency, prior, after,
        unrealized).await
}

#[tauri::command]
async fn ledger(
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    accountids: Vec<AccountId>,
    occurrences: u16,
) -> Vec<alere_lib::ledger::TransactionDescr> {
    let connection = crate::connections::get_connection();
    alere_lib::ledger::ledger(
       connection, mindate, maxdate, accountids, occurrences).await
}

#[tauri::command]
async fn new_file(
    name: String,
    kind: String,
    source: String,
) -> bool {
    info!("new_file {} {} {}", name, kind, source);
    true
}

fn main() {
    // Configure logging, with a default to show all traces
    env_logger::Builder::from_env(
        Env::default().default_filter_or("trace")
        ).init();

    let context = tauri::generate_context!();

    let config = context.config();
    println!("App: log={:?} data={:?} config={:?}",
        tauri::api::path::app_log_dir(config).unwrap(),
        tauri::api::path::app_data_dir(config).unwrap(),
        tauri::api::path::app_config_dir(config).unwrap());

    tauri::Builder::default()
        .menu(create_menu())
        .on_menu_event(|event| {
            //  Send the event to the front-end
            event.window()
                .emit("menu-event", event.menu_item_id())
                .unwrap();
        })
        .invoke_handler(tauri::generate_handler![
            new_file,
            fetch_accounts,
            income_expense,
            ledger,
            mean,
            balance,
            metrics,
            networth_history,
            quotes,
        ])
        .run(context)
        .expect("error while running tauri application");
}
