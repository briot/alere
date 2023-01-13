#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use alere_lib::models::{AccountId, CommodityId};
use alere_lib::quotes::{ForAccount, Symbol};
use alere_lib::connections::Database;
use chrono::{DateTime, Utc};
use env_logger::Env;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::RwLock;
use tauri::{Menu, CustomMenuItem, MenuItem, Submenu};

struct LockedPool (pub RwLock<Database>);

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
async fn fetch_accounts(
    pool: tauri::State<'_, LockedPool>,
) -> Result<alere_lib::accounts::Accounts, ()> {
    let p = pool.0.read().unwrap();
    let connection = p.get();
    Ok(alere_lib::accounts::fetch_accounts(connection))
}

#[tauri::command]
async fn quotes(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
    commodities: Option<Vec<CommodityId>>,
    accounts: Option<Vec<AccountId>>
) -> Result<(Vec<Symbol>, HashMap<AccountId, ForAccount>), ()> {
    let p = pool.0.read().unwrap();
    let connection = p.get();
    Ok(alere_lib::quotes::quotes(
        connection, mindate, maxdate, currency, commodities,
        accounts))
}

#[tauri::command]
async fn income_expense(
    pool: tauri::State<'_, LockedPool>,
    income: bool,
    expense: bool,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> Result<alere_lib::income_expense::IncomeExpenseInPeriod, ()> {
    let p = pool.0.read().unwrap();
    let connection = p.get();
    Ok(alere_lib::income_expense::income_expense(
        connection, income, expense, mindate, maxdate, currency
    ))
}

#[tauri::command]
async fn balance(
    pool: tauri::State<'_, LockedPool>,
    dates: Vec<DateTime<Utc>>,
    currency: CommodityId,
) -> Result<Vec<alere_lib::metrics::PerAccount>, ()> {
    let p = pool.0.read().unwrap();
    let connection = p.get();
    Ok(alere_lib::metrics::balance(connection, dates, currency))
}

#[tauri::command]
async fn metrics(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> Result<alere_lib::metrics::Networth, ()> {
    let p = pool.0.read().unwrap();
    let connection = p.get();
    Ok(alere_lib::metrics::metrics(
        connection, mindate, maxdate, currency))
}

#[tauri::command]
async fn networth_history(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> Result<Vec<alere_lib::metrics::NWPoint>, ()> {
    let p = pool.0.read().unwrap();
    let connection = p.get();
    Ok(alere_lib::metrics::networth_history(
       connection, mindate, maxdate, currency))
}

#[tauri::command]
async fn mean(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
    prior: u8,
    after: u8,
    unrealized: bool,
) -> Result<Vec<alere_lib::means::Point>, ()> {
    let p = pool.0.read().unwrap();
    let connection = p.get();
    Ok(alere_lib::means::mean(
        connection, mindate, maxdate, currency, prior, after, unrealized))
}

#[tauri::command]
async fn ledger(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    accountids: Vec<AccountId>,
    occurrences: u16,
) -> Result<Vec<alere_lib::ledger::TransactionDescr>, ()> {
    let p = pool.0.read().unwrap();
    let connection = p.get();
    Ok(alere_lib::ledger::ledger(
       connection, mindate, maxdate, accountids, occurrences))
}

#[tauri::command]
fn open_file(
    pool: tauri::State<'_, LockedPool>,
    name: String,
) -> Result<(), &'static str> {
    let mut p = pool.0.write().unwrap();
    p.set_file(PathBuf::from(name));
    Ok(())
}

#[tauri::command]
fn new_file(
    name: String,
    kind: String,
    source: String,
) -> Result<(), &'static str> {
    return match kind.as_str() {
        "none"     => Ok(()),
        "kmymoney" => alere_lib::kmymoney_import::import(name, source),
        _          => Err("Invalid import kind"),
    }
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
        .manage(LockedPool(RwLock::new(
            Database::new(tauri::api::path::document_dir()))
        ))
        .menu(create_menu())
        .on_menu_event(|event| {
            //  Send the event to the front-end
            event.window()
                .emit("menu-event", event.menu_item_id())
                .unwrap();
        })
        .invoke_handler(tauri::generate_handler![
            open_file,
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
