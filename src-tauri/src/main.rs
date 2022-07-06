#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

#[macro_use]
extern crate diesel;
extern crate dotenv;

#[macro_use]
extern crate lazy_static;

pub mod schema;
pub mod models;
pub mod metrics;
pub mod accounts;
pub mod connections;
pub mod scenarios;
pub mod dates;

fn main() {
  let context = tauri::generate_context!();
  tauri::Builder::default()
    .menu(tauri::Menu::os_default(&context.package_info().name))
    .invoke_handler(tauri::generate_handler![
        metrics::compute_networth,
        accounts::fetch_accounts,
    ])
    .run(context)
    .expect("error while running tauri application");
}
