#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[macro_use]
extern crate diesel;

pub mod accounts;
pub mod cashflow;
pub mod connections;
pub mod income_expense;
pub mod ledger;
pub mod means;
pub mod metrics;
pub mod quotes;

use env_logger::Env;
use tauri::{Menu, CustomMenuItem, MenuItem, Submenu};

fn create_menu() -> Menu {
    Menu::new()
    .add_submenu(Submenu::new(
        "File",
        Menu::new()
        .add_item(
            CustomMenuItem::new("open", "Open/New File")
            .accelerator("cmdOrControl+O"))
        .add_native_item(MenuItem::Quit)
    )).add_submenu(Submenu::new(
        "Edit",
        Menu::new()
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
    )).add_submenu(Submenu::new(
        "Window",
        Menu::new()
        .add_native_item(MenuItem::Minimize)
        .add_native_item(MenuItem::CloseWindow)
    ))
}

fn main() {

    // Configure logging, with a default to show all traces
    env_logger::Builder::from_env(
        Env::default().default_filter_or("trace")
        ).init();

    let context = tauri::generate_context!();

    let config = context.config();
    println!("App: log={:?} data={:?} config={:?}",
        tauri::api::path::app_log_dir(&config).unwrap(),
        tauri::api::path::app_data_dir(&config).unwrap(),
        tauri::api::path::app_config_dir(&config).unwrap());

    tauri::Builder::default()
        .menu(create_menu())
        .on_menu_event(|event| match event.menu_item_id() {
            "open" => {
                //  Send the even to the front-end
                let _ = event.window().emit("menu-event", "open").unwrap();
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            accounts::fetch_accounts,
            income_expense::income_expense,
            ledger::ledger,
            means::mean,
            metrics::balance,
            metrics::metrics,
            metrics::networth_history,
            quotes::quotes,
        ])
        .run(context)
        .expect("error while running tauri application");
}
