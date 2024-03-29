#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

pub mod settings;

use crate::settings::Settings;
use alere_lib::connections::Database;
use alere_lib::errors::AlrResult;
use alere_lib::models::{AccountId, CommodityId};
use alere_lib::quotes::{ForAccount, Symbol};
use chrono::{DateTime, Utc};
use env_logger::Env;
use log::debug;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::RwLock;
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

struct LockedPool(pub RwLock<Database>);
struct LockedSettings(pub RwLock<Settings>);

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
                .add_native_item(MenuItem::Quit),
        ))
        .add_submenu(Submenu::new(
            "Edit",
            Menu::new()
                .add_native_item(MenuItem::Cut)
                .add_native_item(MenuItem::Copy)
                .add_native_item(MenuItem::Paste),
        ))
        .add_submenu(Submenu::new(
            "Tools",
            Menu::new()
                .add_item(CustomMenuItem::new("update_prices", "Update Prices"))
                .add_item(CustomMenuItem::new("settings", "Settings...")),
        ))
        .add_submenu(Submenu::new(
            "Window",
            Menu::new()
                .add_native_item(MenuItem::Minimize)
                .add_native_item(MenuItem::CloseWindow),
        ))
}

#[tauri::command]
async fn fetch_accounts(
    pool: tauri::State<'_, LockedPool>,
) -> AlrResult<alere_lib::account_lists::Accounts> {
    let p = pool.0.read().unwrap();
    let connection = p.get()?;
    alere_lib::account_lists::fetch_accounts(connection)
}

#[tauri::command]
async fn quotes(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
    commodities: Option<Vec<CommodityId>>,
    accounts: Option<Vec<AccountId>>,
) -> AlrResult<(Vec<Symbol>, HashMap<AccountId, ForAccount>)> {
    let p = pool.0.read().unwrap();
    let connection = p.get()?;
    alere_lib::quotes::quotes(
        connection,
        mindate,
        maxdate,
        currency,
        commodities,
        accounts,
    )
}

#[tauri::command]
async fn income_expense(
    pool: tauri::State<'_, LockedPool>,
    income: bool,
    expense: bool,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> AlrResult<alere_lib::income_expense::IncomeExpenseInPeriod> {
    let p = pool.0.read().unwrap();
    let connection = p.get()?;
    Ok(alere_lib::income_expense::income_expense(
        connection, income, expense, mindate, maxdate, currency,
    ))
}

#[tauri::command]
async fn balance(
    pool: tauri::State<'_, LockedPool>,
    dates: Vec<DateTime<Utc>>,
    currency: CommodityId,
) -> AlrResult<Vec<alere_lib::metrics::PerAccount>> {
    let p = pool.0.read().unwrap();
    let connection = p.get()?;
    alere_lib::metrics::balance(connection, dates, currency)
}

#[tauri::command]
async fn metrics(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> AlrResult<alere_lib::metrics::Networth> {
    let p = pool.0.read().unwrap();
    let connection = p.get()?;
    alere_lib::metrics::metrics(connection, mindate, maxdate, currency)
}

#[tauri::command]
async fn networth_history(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> AlrResult<Vec<alere_lib::metrics::NWPoint>> {
    let p = pool.0.read().unwrap();
    let connection = p.get()?;
    alere_lib::metrics::networth_history(connection, mindate, maxdate, currency)
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
) -> AlrResult<Vec<alere_lib::means::Point>> {
    let p = pool.0.read().unwrap();
    let connection = p.get()?;
    alere_lib::means::mean(
        connection, mindate, maxdate, currency, prior, after, unrealized,
    )
}

#[tauri::command]
async fn ledger(
    pool: tauri::State<'_, LockedPool>,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    accountids: Vec<AccountId>,
    occurrences: u16,
) -> AlrResult<Vec<alere_lib::ledger::TransactionDescr>> {
    let p = pool.0.read().unwrap();
    let connection = p.get()?;
    alere_lib::ledger::ledger(connection, mindate, maxdate, accountids, occurrences)
}

#[tauri::command]
fn open_file(
    pool: tauri::State<'_, LockedPool>,
    settings: tauri::State<'_, LockedSettings>,
    name: String,
) -> AlrResult<()> {
    let path = PathBuf::from(name);
    let mut p = pool.0.write().unwrap();
    match p.open_file(&path) {
        Ok(()) => {
            let mut s = settings.0.write().unwrap();
            s.add_recent_file(&path);
            Ok(())
        }
        Err(e) => Err(format!("{}", e).into()),
    }
}

#[tauri::command]
fn new_file(
    pool: tauri::State<'_, LockedPool>,
    settings: tauri::State<'_, LockedSettings>,
    name: String,
    kind: String,
    source: String,
) -> AlrResult<()> {
    let path = PathBuf::from(name);
    match kind.as_str() {
        "none" => {
            let mut p = pool.0.write().unwrap();
            p.create_file(&path)
        }
        "kmymoney" => {
            let s = PathBuf::from(source);
            if let Err(e) = alere_lib::kmymoney_import::import(&path, &s) {
                return Err(format!("{}", e).into());
            }
            Ok(())
        }
        _ => Err("Invalid import kind".into()),
    }?;

    let mut s = settings.0.write().unwrap();
    s.add_recent_file(&path);
    Ok(())
}

fn main() {
    // Configure logging, with a default to show all traces
    env_logger::Builder::from_env(Env::default().default_filter_or("trace")).init();

    let context = tauri::generate_context!();

    let config = context.config();
    let app_config_dir = tauri::api::path::app_config_dir(config);
    debug!(
        "App: log={:?} data={:?} config={:?}",
        tauri::api::path::app_log_dir(config).unwrap(),
        tauri::api::path::app_data_dir(config).unwrap(),
        app_config_dir
    );

    let mut settings = Settings::load(&app_config_dir).unwrap();
    let default_db_file = settings.default_file();

    if let Err(e) = alere_lib::kmymoney_import::import(
        &PathBuf::from(&default_db_file),
        // Current directory is src-tauri, in development mode
        &PathBuf::from(std::path::Path::new("../Comptes.kmy")),
    ) {
        println!("Error importing file: {}", e);
        return;
    }

    let mut db: Database = Default::default();

    // Might fail to open the database
    {
        if db.open_file(&default_db_file).is_ok() {
            settings.add_recent_file(&default_db_file);
        }
    }

    tauri::Builder::default()
        .manage(LockedPool(RwLock::new(db)))
        .manage(LockedSettings(RwLock::new(settings)))
        .menu(create_menu())
        .on_menu_event(|event| {
            //  Send the event to the front-end
            event
                .window()
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
